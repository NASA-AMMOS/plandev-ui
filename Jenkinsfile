def getSeqTag() {
	def branchName = env.BRANCH_NAME.replaceAll('/', '_').replace('release_', '')
	def shortDate = new Date().format('yyyyMMdd')
	def shortCommit = env.GIT_COMMIT.take(7)
	return "${branchName}+b${BUILD_NUMBER}.r${shortCommit}.${shortDate}"
}

def getDockerTag() {
  def tag = getSeqTag().replaceAll('\\+', '-')
  return "cae-artifactory.jpl.nasa.gov:16001/gov/nasa/jpl/ammos/mpsa/aerie-ui:${tag}"
}

pipeline {
	options {
		disableConcurrentBuilds()
	}
	agent {
		label 'coronado || Pismo || San-clemente || Sugarloaf'
	}
	stages {
		stage ('src archive') {
			when {
				expression { BRANCH_NAME ==~ /^release.*/ }
			}
			steps {
				sh "tar -czf aerie-ui-src-${getSeqTag()}.tar.gz --exclude='.git' `ls -A`"
			}
		}
		stage ('build') {
			steps {
				withCredentials([
          usernamePassword(
            credentialsId: '9db65bd3-f8f0-4de0-b344-449ae2782b86',
            passwordVariable: 'DOCKER_LOGIN_PASSWORD',
            usernameVariable: 'DOCKER_LOGIN_USERNAME'
          )
        ]) {
          script {
            def statusCode = sh returnStatus: true, script:
            """
            # Don't echo commands by default
						set +x

            # Setup ENV
            export PATH=/usr/local/bin:/usr/bin
            export LD_LIBRARY_PATH=/usr/local/lib64:/usr/local/lib:/usr/lib64:/usr/lib

            # Setup NVM/Node.js
            export NVM_DIR="\$HOME/.nvm"
            if [ ! -d \$NVM_DIR ]; then
              curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.8/install.sh | bash
            fi
            [ -s "\$NVM_DIR/nvm.sh" ] && . "\$NVM_DIR/nvm.sh"
            nvm install v10.13.0

            # Install dependencies, test, and build
            npx yarn
            npx yarn test
            npx yarn build --prod

            # Build Docker image
            docker build -t "${getDockerTag()}" --rm .
            """
            if (statusCode > 0) {
              error "build failed"
            }
          }
				}
				junit allowEmptyResults: true, healthScaleFactor: 10.0, keepLongStdio: true, testResults: '**/unit-test-results.xml'
			}
		}
		stage ('build archive') {
			steps {
				script {
					def statusCode = sh returnStatus: true, script:
					"""
          cd dist
          tar -czf aerie-ui-${getSeqTag()}.tar.gz `ls -A`
					"""
					if (statusCode > 0) {
						error "build archive failed"
					}
				}
				archiveArtifacts allowEmptyArchive: true, artifacts: 'dist/*.tar.gz'
			}
		}
		stage ('publish') {
			when {
				expression { BRANCH_NAME ==~ /(develop|release.*|PR-.*)/ }
			}
			steps {
				script {
					try {
						def server = Artifactory.newServer url: 'https://cae-artifactory.jpl.nasa.gov/artifactory', credentialsId: '9db65bd3-f8f0-4de0-b344-449ae2782b86'
						def uploadSpec =
						'''{
							"files": [
								{
									"pattern": "dist/aerie-ui-*.tar.gz",
									"target": "general-develop/gov/nasa/jpl/ammos/mpsa/aerie-ui/",
									"recursive": false
								}
							]
						}'''
						def buildInfo = server.upload spec: uploadSpec
						server.publishBuildInfo buildInfo
					} catch (Exception e) {
						println("Publishing to Artifactory failed with exception: ${e.message}")
						currentBuild.result = 'UNSTABLE'
					}
				}
				withCredentials([
          usernamePassword(
            credentialsId: '9db65bd3-f8f0-4de0-b344-449ae2782b86',
            passwordVariable: 'DOCKER_LOGIN_PASSWORD',
            usernameVariable: 'DOCKER_LOGIN_USERNAME'
          )
        ]) {
					script {
						def statusCode = sh returnStatus: true, script:
						"""
            echo "${DOCKER_LOGIN_PASSWORD}" | docker login -u "${DOCKER_LOGIN_USERNAME}" cae-artifactory.jpl.nasa.gov:16001 --password-stdin
            docker push "${getDockerTag()}"
            docker logout cae-artifactory.jpl.nasa.gov:16001
						"""
						if (statusCode > 0) {
							error "publish failed"
						}
					}
				}
			}
		}
	}
	post {
		always {
			sh "docker rmi ${getDockerTag()}"
		}
		unstable {
			emailext subject: "Jenkins UNSTABLE: ${env.JOB_BASE_NAME} #${env.BUILD_NUMBER}",
			body: """
				<p>Jenkins job unstable (failed tests): <br> <a href=\"${env.BUILD_URL}\">${env.JOB_NAME} #${env.BUILD_NUMBER}</a></p>
			""",
			mimeType: 'text/html',
			recipientProviders: [[$class: 'FailingTestSuspectsRecipientProvider']]
		}
		failure {
			emailext subject: "Jenkins FAILURE: ${env.JOB_BASE_NAME} #${env.BUILD_NUMBER}",
			body: """
				<p>Jenkins job failure: <br> <a href=\"${env.BUILD_URL}\">${env.JOB_NAME} #${env.BUILD_NUMBER}</a></p>
			""",
			mimeType: 'text/html',
			recipientProviders: [[$class: 'CulpritsRecipientProvider']]
		}
	}
}
