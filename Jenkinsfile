def getDockerTag() {
  return "cae-artifactory.jpl.nasa.gov:16001/gov/nasa/jpl/ammos/mpsa/aerie-ui:${BRANCH_NAME}"
}

pipeline {
	options {
		disableConcurrentBuilds()
	}
	agent {
    // Currently aws cli version 2 is only installed on coronado server
    // TODO: Add more servers as needed when they are correctly provisioned
		label 'coronado'
	}
	environment {
		AWS_ACCESS_KEY_ID = credentials('aerie-aws-access-key')
    AWS_DEFAULT_REGION = 'us-gov-west-1'
		AWS_ECR = "448117317272.dkr.ecr.us-gov-west-1.amazonaws.com"
    AWS_SECRET_ACCESS_KEY = credentials('aerie-aws-secret-access-key')
	}
	stages {
		stage ('src archive') {
			when {
				expression { BRANCH_NAME ==~ /release/ }
			}
			steps {
				sh "tar -czf aerie-ui-src-release.tar.gz --exclude='.git' `ls -A`"
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
            nvm install v12.14.1

            # Install dependencies, test, and build
            npx yarn --silent
            npx yarn test
            npx yarn build --prod

            # Cloc, then print size of dist folder
            npx yarn cloc
            du -sh dist
            du -sh dist/*

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
      when {
				expression { BRANCH_NAME ==~ /(develop|staging|release)/ }
			}
			steps {
				script {
					def statusCode = sh returnStatus: true, script:
					"""
          cd dist
          tar -czf aerie-ui-${BRANCH_NAME}.tar.gz `ls -A`
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
				expression { BRANCH_NAME ==~ /(develop|staging|release)/ }
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
		stage('Deploy') {
			when {
				expression { GIT_BRANCH ==~ /(develop|staging|release)/ }
			}
			steps {
				withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: 'mpsa-aws-test-account']]) {
					script{
						echo 'Logging out docker'
						sh 'docker logout || true'

						echo 'Logging into ECR using aws cli version 2'
						sh ('aws ecr get-login-password | docker login --username AWS --password-stdin https://$AWS_ECR')

						docker.withRegistry(AWS_ECR) {
							echo "Tagging docker images to point to AWS ECR"
							sh '''
							docker tag $(docker images | awk '\$1 ~ /aerie-ui/ { print \$3; exit }') ${AWS_ECR}/aerie/ui:${GIT_BRANCH}
							'''
							echo 'Pushing images to ECR'
							sh "docker push ${AWS_ECR}/aerie/ui:${GIT_BRANCH}"

              sleep 5
              echo "Restarting the task in ECS cluster"
              try {
                sh '''
                aws ecs stop-task --cluster "aerie-${GIT_BRANCH}-cluster" --task $(aws ecs list-tasks --cluster "aerie-${GIT_BRANCH}-cluster" --output text --query taskArns[0])
                '''
              } catch (Exception e) {
                echo "Restarting the task failed"
                echo e.getMessage()
              }
						}
					}
				}
			}
	   }
	}
	post {
		always {
			sh "docker rmi ${getDockerTag()}"

			echo 'Cleaning up images'
			sh "docker image prune -f"

			echo 'Logging out docker'
			sh 'docker logout || true'
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
