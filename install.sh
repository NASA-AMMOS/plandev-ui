#!/usr/bin/env bash
set -u

BASE_DIR="."
AERIE_DOCKER_COMPOSE="aerie-docker-compose"
AERIE_DOCKER_COMPOSE_DIR="$BASE_DIR/$AERIE_DOCKER_COMPOSE"
AERIE_DOCKER_COMPOSE_TAR="$AERIE_DOCKER_COMPOSE.tar.gz"
ARTIFACTORY_AERIE_PATH="artifactory/general-develop/gov/nasa/jpl/ammos/mpsa/aerie"
ARTIFACTORY_PORT="16001"
ARTIFACTORY_URL="https://cae-artifactory.jpl.nasa.gov"

abort() {
  printf "%s\n" "$1"
  exit 1
}

check_error() {
  if [ $? -eq 1 ]; then
    exit 1
  fi
}

print_aerie_banner() {
  echo
  echo " █████╗ ███████╗██████╗ ██╗███████╗"
  echo "██╔══██╗██╔════╝██╔══██╗██║██╔════╝"
  echo "███████║█████╗  ██████╔╝██║█████╗  "
  echo "██╔══██║██╔══╝  ██╔══██╗██║██╔══╝  "
  echo "██║  ██║███████╗██║  ██║██║███████╗"
  echo "╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝╚══════╝"
  echo "https://github.jpl.nasa.gov/MPS/aerie"
  echo
}

check_docker_installed() {
  if ! [ -x "$(command -v docker)" ]; then
    abort "Error: Docker is not installed."
  fi
}

prompt_jpl_username_password() {
  echo "To install and run Aerie, please enter your JPL username and password:"
  read -p 'Username: ' username
  read -sp 'Password: ' password
  echo
}

login_docker_artifactory() {
  echo "Logging into Docker Artifactory..."
  echo $password | docker login "$ARTIFACTORY_URL:$ARTIFACTORY_PORT" --username $username --password-stdin
  check_error
}

pull_latest_docker_compose() {
  echo "Pulling latest Aerie Docker compose directory..."
  curl -u "$username:$password" -o ./aerie-docker-compose.tar.gz -fsSL "$ARTIFACTORY_URL/$ARTIFACTORY_AERIE_PATH/$AERIE_DOCKER_COMPOSE_TAR"
  check_error
  echo "Extracting Docker compose directory..."
  rm -rf $AERIE_DOCKER_COMPOSE_DIR
  mkdir $AERIE_DOCKER_COMPOSE_DIR
  tar -C $AERIE_DOCKER_COMPOSE_DIR -zxvf $AERIE_DOCKER_COMPOSE_TAR
  rm -rf $AERIE_DOCKER_COMPOSE_TAR
}

run_aerie() {
  echo "Running Aerie..."
  cd $AERIE_DOCKER_COMPOSE_DIR
  docker-compose up --build
}

main() {
  print_aerie_banner
  check_docker_installed
  prompt_jpl_username_password
  login_docker_artifactory
  pull_latest_docker_compose
  run_aerie
}

main
