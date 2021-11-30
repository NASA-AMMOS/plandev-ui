def getArtifactoryPort() {
  if (GIT_BRANCH ==~ /release-.*/) {
    return "16003"
  } else if (GIT_BRANCH ==~ /staging/) {
    return "16002"
  } else {
    return "16001"
  }
}

pipeline {
  options {
    disableConcurrentBuilds()
  }
  agent {
    label 'CAE-Jenkins2-DH-Agents-Linux'
  }
  environment {
    ARTIFACTORY_URL = "artifactory.jpl.nasa.gov:${getArtifactoryPort()}"
    DOCKER_UI_ARTIFACTORY = "${ARTIFACTORY_URL}/gov/nasa/jpl/aerie/aerie-ui:${GIT_BRANCH}"
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
                # Downgrade NPM
                # https://github.com/npm/cli/issues/2008
                npm install npm@6.14.15 -g

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
                docker build -t ${DOCKER_UI_ARTIFACTORY} --rm .
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
                echo "${DOCKER_LOGIN_PASSWORD}" | docker login -u ${DOCKER_LOGIN_USERNAME} ${ARTIFACTORY_URL} --password-stdin
                docker push ${DOCKER_UI_ARTIFACTORY}
                docker logout ${ARTIFACTORY_URL}
              '''
            }
          }
        }
      }
      post {
        always {
          sh '''
            docker rmi ${DOCKER_UI_ARTIFACTORY} --force
          '''
        }
        cleanup {
          cleanWs()
          deleteDir()
        }
      }
    }
  }
}
