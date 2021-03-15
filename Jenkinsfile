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

void setBuildStatus(String message, String state, String context) {
  step([
    $class: "GitHubCommitStatusSetter",
    reposSource: [$class: "ManuallyEnteredRepositorySource", url: env.GIT_URL],
    commitShaSource: [$class: "ManuallyEnteredShaSource", sha: env.GIT_COMMIT],
    contextSource: [$class: "ManuallyEnteredCommitContextSource", context: context],
    errorHandlers: [[$class: "ChangingBuildStatusErrorHandler", result: "UNSTABLE"]],
    statusResultSource: [ $class: "ConditionalStatusResultSource", results: [[$class: "AnyBuildResult", message: message, state: state.toUpperCase()]] ]
  ]);
}

pipeline {
  options {
    disableConcurrentBuilds()
  }
  agent {
    label 'CAE-Jenkins2-DH-Agents-Linux'
  }
  environment {
    ARTIFACT_TAG = "${GIT_BRANCH}"
    ARTIFACTORY_URL = "artifactory.jpl.nasa.gov:${getArtifactoryPort()}"
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
    stage ('Enter Docker Container') {
      agent {
        docker {
          reuseNode true
          registryUrl 'https://artifactory.jpl.nasa.gov:16001'
          registryCredentialsId 'Artifactory-credential'
          image 'gov/nasa/jpl/ammos/mpsa/aerie/jenkins/aerie-ui:latest'
          alwaysPull true
          args '-u root --mount type=bind,source=${WORKSPACE},target=/home --workdir=/home -v /var/run/docker.sock:/var/run/docker.sock'
        }
      }
      stages {
        stage ('build') {
          steps {
            withCredentials([
              usernamePassword(
                credentialsId: '34c6de8f-197d-46e5-aeb3-2153697dcb9c',
                passwordVariable: 'PASS',
                usernameVariable: 'EMAIL'
              )
            ]) {
              script { setBuildStatus("Building & Testing", "pending", "jenkins/branch-check"); }
              sh '''
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

              # Setup NPM to fetch from Artifactory
              npm config set @gov.nasa.jpl.aerie:registry=https://artifactory.jpl.nasa.gov/artifactory/api/npm/npm-release-virtual/
              npm config set email=$EMAIL
              npm config set always-auth=true
              npm config set _auth=$PASS

              # Install server dependencies, and build
              cd server
              npm install
              npm run build
              rm -rf node_modules
              npm install --only=production
              cd ..

              # Install front-end dependencies, build, and cloc
              npm install
              npm run build:prod
              npm run cloc

              # Build Docker image
              docker build -t "${DOCKER_TAG_ARTIFACTORY}" --rm .
              '''
            }
          }
        }
        stage ('build archive') {
          when {
            expression { GIT_BRANCH ==~ /(develop|staging|release-.*)/ }
          }
          steps {
            sh '''
            cd server/public
            tar -czf aerie-ui-${GIT_BRANCH}.tar.gz `ls -A`
            '''
          }
        }
        stage ('publish') {
          when {
            expression { GIT_BRANCH ==~ /(develop|staging|release-.*)/ }
          }
          steps {
            script {
              try {
                def server = Artifactory.newServer url: 'https://artifactory.jpl.nasa.gov/artifactory', credentialsId: '9db65bd3-f8f0-4de0-b344-449ae2782b86'
                def uploadSpec =
                """{
                  "files": [
                    {
                      "pattern": "server/public/aerie-ui-*.tar.gz",
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
              sh '''
              echo "${DOCKER_LOGIN_PASSWORD}" | docker login -u "${DOCKER_LOGIN_USERNAME}" ${ARTIFACTORY_URL} --password-stdin
              docker push "${DOCKER_TAG_ARTIFACTORY}"
              docker logout ${ARTIFACTORY_URL}
              '''
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
        cleanup {
          cleanWs()
          deleteDir()
        }
      }
    }
  }
  post {
    always {
      sh "docker rmi ${DOCKER_TAG_ARTIFACTORY} || true"
      sh "docker rmi ${DOCKER_TAG_AWS} || true"
      sh "docker image prune -f || true"
      sh "docker logout || true"

      setBuildStatus("Build ${currentBuild.currentResult}", "${currentBuild.currentResult}", "jenkins/branch-check")
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
