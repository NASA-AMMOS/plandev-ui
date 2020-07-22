def getArtifactoryPort() {
  if (GIT_BRANCH ==~ /release-.*/) {
    return "16003"
  } else if (GIT_BRANCH ==~ /staging/) {
    return "16002"
  } else {
    return "16001"
  }
}

def getDockerCompatibleTag(tag) {
  def fixedTag = tag.replaceAll('\\+', '-').replaceAll('/', '-')
  return fixedTag
}

def getPublishPath() {
  if (GIT_BRANCH ==~ /release-.*/) {
    return "general/gov/nasa/jpl/aerie/"
  } else if (GIT_BRANCH ==~ /staging/) {
    return "general-stage/gov/nasa/jpl/aerie/"
  } else {
    return "general-develop/gov/nasa/jpl/aerie/"
  }
}

pipeline {
  options {
    disableConcurrentBuilds()
  }
  agent {
    label 'coronado || Pismo || San-clemente || Sugarloaf'
  }
  environment {
    ARTIFACT_TAG = "${GIT_BRANCH}"
    ARTIFACTORY_URL = "cae-artifactory.jpl.nasa.gov:${getArtifactoryPort()}"
    AWS_ACCESS_KEY_ID = credentials('aerie-aws-access-key')
    AWS_CLUSTER = "aerie-${GIT_BRANCH}-cluster"
    AWS_DEFAULT_REGION = 'us-gov-west-1'
    AWS_ECR = "448117317272.dkr.ecr.us-gov-west-1.amazonaws.com"
    AWS_SECRET_ACCESS_KEY = credentials('aerie-aws-secret-access-key')
    DOCKER_TAG = "${getDockerCompatibleTag(ARTIFACT_TAG)}"
    DOCKER_TAG_ARTIFACTORY = "${ARTIFACTORY_URL}/gov/nasa/jpl/aerie/aerie-ui:${DOCKER_TAG}"
    DOCKER_TAG_AWS = "${AWS_ECR}/aerie/ui:${DOCKER_TAG}"
  }
  stages {
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
            rm -rf node_modules
            npx yarn --silent
            npx yarn test
            npx yarn build --prod

            # Cloc, then print size of dist folder
            npx yarn cloc
            du -sh dist
            du -sh dist/*

            # Build Docker image
            docker build -t "${DOCKER_TAG_ARTIFACTORY}" --rm .
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
        expression { GIT_BRANCH ==~ /(develop|staging|release-.*)/ }
      }
      steps {
        script {
          def statusCode = sh returnStatus: true, script:
          """
          cd dist
          tar -czf aerie-ui-${GIT_BRANCH}.tar.gz `ls -A`
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
        expression { GIT_BRANCH ==~ /(develop|staging|release-.*)/ }
      }
      steps {
        script {
          try {
            def server = Artifactory.newServer url: 'https://cae-artifactory.jpl.nasa.gov/artifactory', credentialsId: '9db65bd3-f8f0-4de0-b344-449ae2782b86'
            def uploadSpec =
            """{
              "files": [
                {
                  "pattern": "dist/aerie-ui-*.tar.gz",
                  "target": "${getPublishPath()}",
                  "recursive": false
                }
              ]
            }"""
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
            echo "${DOCKER_LOGIN_PASSWORD}" | docker login -u "${DOCKER_LOGIN_USERNAME}" ${ARTIFACTORY_URL} --password-stdin
            docker push "${DOCKER_TAG_ARTIFACTORY}"
            docker logout ${ARTIFACTORY_URL}
            """
            if (statusCode > 0) {
              error "publish failed"
            }
          }
        }
      }
    }
    stage('deploy') {
      when {
        expression { GIT_BRANCH ==~ /(develop|staging|release-.*)/ }
      }
      steps {
        withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: 'mpsa-aws-test-account']]) {
          script{
            echo 'Logging out docker'
            sh 'docker logout || true'

            echo 'Logging into ECR using aws cli version 2'
            sh ('aws ecr get-login-password | docker login --username AWS --password-stdin https://$AWS_ECR')

            docker.withRegistry(AWS_ECR) {
              echo "Tagging docker image to point to AWS ECR"
              sh '''
              docker tag ${DOCKER_TAG_ARTIFACTORY} ${DOCKER_TAG_AWS}
              '''
              echo 'Pushing image to ECR'
              sh "docker push ${DOCKER_TAG_AWS}"

              sleep 5
              echo "Restarting the task in ECS cluster"
              try {
                sh '''
                aws ecs stop-task --cluster "${AWS_CLUSTER}" --task $(aws ecs list-tasks --cluster "${AWS_CLUSTER}" --output text --query taskArns[0])
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
      sh "docker rmi ${DOCKER_TAG_ARTIFACTORY} || true"
      sh "docker rmi ${DOCKER_TAG_AWS} || true"

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
