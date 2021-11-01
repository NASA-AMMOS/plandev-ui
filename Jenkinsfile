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
    MODE = "${GIT_BRANCH}"
    DOCKER_TAG = "${getDockerCompatibleTag(ARTIFACT_TAG)}"
    DOCKER_TAG_ARTIFACTORY = "${ARTIFACTORY_URL}/gov/nasa/jpl/aerie/aerie-ui:${DOCKER_TAG}"
    DOCKER_TAG_AWS = "${AWS_ECR}/aerie/ui:${DOCKER_TAG}"
  }
  stages {
    stage('Docker') {
      agent {
        docker {
          alwaysPull true
          args '-u root --mount type=bind,source=${WORKSPACE},target=/home --workdir=/home -v /var/run/docker.sock:/var/run/docker.sock'
          image 'gov/nasa/jpl/aerie/jenkins/aerie-node:latest'
          registryCredentialsId 'Artifactory-credential'
          registryUrl 'https://artifactory.jpl.nasa.gov:16001'
          reuseNode true
        }
      }
      stages {
        stage ('Build') {
          steps {
            withCredentials([
              usernamePassword(
                credentialsId: '34c6de8f-197d-46e5-aeb3-2153697dcb9c',
                passwordVariable: 'NPM_PASSWORD',
                usernameVariable: 'NPM_EMAIL'
              )
            ]) {
              sh '''
                # Upgrade NPM
                npm install npm -g

                # Setup NPM to fetch from Artifactory
                npm config set @gov.nasa.jpl.stellar:registry=https://artifactory.jpl.nasa.gov/artifactory/api/npm/npm-release-virtual/
                npm config set email=$NPM_EMAIL
                npm config set always-auth=true
                npm config set _auth=$NPM_PASSWORD

                # Install dependencies, build, and cloc
                npm ci
                npm run build
                npm run cloc

                # Build Docker image
                docker build -t "${DOCKER_TAG_ARTIFACTORY}" --rm .
              '''
            }
          }
        }
        stage ('Publish to Artifactory') {
          when {
            expression { GIT_BRANCH ==~ /(develop|staging|release-.*)/ }
          }
          steps {
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
        stage('Deploy to AWS') {
          when {
            expression { GIT_BRANCH ==~ /(develop|staging)/ }
          }
          steps {
            withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: 'mpsa-aws-test-account']]) {
              script{
                sh '''
                  aws ecr get-login-password | docker login --username AWS --password-stdin https://$AWS_ECR
                  docker tag ${DOCKER_TAG_ARTIFACTORY} ${DOCKER_TAG_AWS}
                  docker push ${DOCKER_TAG_AWS}
                '''

                try {
                  sleep 5
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
      post {
        always {
          sh "docker rmi ${DOCKER_TAG_ARTIFACTORY} || true"
          sh "docker rmi ${DOCKER_TAG_AWS} || true"
          sh "docker logout || true"
        }
        cleanup {
          cleanWs()
          deleteDir()
        }
      }
    }
  }
}
