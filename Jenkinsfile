pipeline {
    agent any
    
    environment {
        // Docker registry credentials
        DOCKER_REGISTRY = 'docker.io'
        DOCKER_REGISTRY_CREDENTIAL = 'dockerhub-credentials'
        
        // Docker image details
        DOCKER_IMAGE_NAME = 'your-dockerhub-username/jenkins-pipeline-demo'
        DOCKER_IMAGE_TAG = "${BUILD_NUMBER}"
        DOCKER_IMAGE_LATEST = 'latest'
        
        // Kubernetes details
        K8S_NAMESPACE = 'default'
        K8S_DEPLOYMENT = 'jenkins-pipeline-demo'
        KUBECONFIG_CREDENTIAL = 'kubeconfig-credentials'
    }
    
    options {
        // Keep last 10 builds
        buildDiscarder(logRotator(numToKeepStr: '10'))
        
        // Timeout after 1 hour
        timeout(time: 1, unit: 'HOURS')
        
        // Add timestamps to console output
        timestamps()
    }
    
    stages {
        stage('1. Checkout') {
            steps {
                script {
                    echo "========== Cloning Repository =========="
                }
                checkout([
                    $class: 'GitSCM',
                    branches: [[name: '*/main']],
                    userRemoteConfigs: [[
                        url: 'https://github.com/YOUR_USERNAME/jenkins-pipeline-demo.git',
                        credentialsId: 'github-credentials'
                    ]]
                ])
            }
        }
        
        stage('2. Install Dependencies') {
            steps {
                script {
                    echo "========== Installing Dependencies =========="
                }
                sh 'cd src && npm install'
            }
        }
        
        stage('3. Unit Tests') {
            steps {
                script {
                    echo "========== Running Unit Tests =========="
                }
                sh 'cd src && npm test'
            }
            post {
                always {
                    junit 'src/junit.xml'
                    publishHTML([
                        reportDir: 'src/coverage',
                        reportFiles: 'index.html',
                        reportName: 'Code Coverage Report'
                    ])
                }
            }
        }
        
        stage('4. Build Docker Image') {
            steps {
                script {
                    echo "========== Building Docker Image =========="
                    sh '''
                        docker build \
                            --tag ${DOCKER_IMAGE_NAME}:${DOCKER_IMAGE_TAG} \
                            --tag ${DOCKER_IMAGE_NAME}:${DOCKER_IMAGE_LATEST} \
                            .
                        
                        docker images | grep jenkins-pipeline-demo
                    '''
                }
            }
        }
        
        stage('5. Push to Docker Registry') {
            when {
                branch 'main'  // Only push on main branch
            }
            steps {
                script {
                    echo "========== Pushing Image to Docker Hub =========="
                    withCredentials([usernamePassword(
                        credentialsId: "${DOCKER_REGISTRY_CREDENTIAL}",
                        usernameVariable: 'DOCKER_USER',
                        passwordVariable: 'DOCKER_PASS'
                    )]) {
                        sh '''
                            echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin
                            docker push ${DOCKER_IMAGE_NAME}:${DOCKER_IMAGE_TAG}
                            docker push ${DOCKER_IMAGE_NAME}:${DOCKER_IMAGE_LATEST}
                            docker logout
                        '''
                    }
                }
            }
        }
        
        stage('6. Deploy to Kubernetes') {
            when {
                branch 'main'  // Only deploy from main branch
            }
            steps {
                script {
                    echo "========== Deploying to Kubernetes =========="
                    withCredentials([file(credentialsId: "${KUBECONFIG_CREDENTIAL}", variable: 'KUBECONFIG_FILE')]) {
                        sh '''
                            export KUBECONFIG=$KUBECONFIG_FILE
                            
                            # Update image tag in deployment
                            kubectl set image deployment/${K8S_DEPLOYMENT} \
                                ${K8S_DEPLOYMENT}=${DOCKER_IMAGE_NAME}:${DOCKER_IMAGE_TAG} \
                                -n ${K8S_NAMESPACE} \
                                || kubectl apply -f k8s/deployment.yaml -n ${K8S_NAMESPACE}
                            
                            # Wait for rollout
                            kubectl rollout status deployment/${K8S_DEPLOYMENT} \
                                -n ${K8S_NAMESPACE} \
                                --timeout=5m
                        '''
                    }
                }
            }
        }
        
        stage('7. Smoke Tests') {
            when {
                branch 'main'
            }
            steps {
                script {
                    echo "========== Running Smoke Tests =========="
                    sh '''
                        # Get service endpoint
                        SERVICE_IP=$(kubectl get service jenkins-pipeline-demo -n default -o jsonpath='{.spec.clusterIP}')
                        
                        # Wait for service to be ready
                        for i in {1..30}; do
                            if curl -f http://$SERVICE_IP:3000/health; then
                                echo "Service is healthy"
                                break
                            fi
                            echo "Waiting for service... ($i/30)"
                            sleep 2
                        done
                        
                        # Run smoke tests
                        curl -f http://$SERVICE_IP:3000/api/users
                        curl -f http://$SERVICE_IP:3000/api/sum/10/20
                    '''
                }
            }
        }
    }
    
    post {
        always {
            script {
                echo "========== Pipeline Execution Summary =========="
                echo "Build Status: ${currentBuild.result}"
                echo "Build Number: ${BUILD_NUMBER}"
                echo "Build Duration: ${currentBuild.durationString}"
            }
            
            // Clean up workspace
            cleanWs()
        }
        
        success {
            script {
                echo "✅ Pipeline completed successfully"
                // Send Slack notification
                // slackSend(channel: '#deployments', message: "✅ Deployment successful for build #${BUILD_NUMBER}")
            }
        }
        
        failure {
            script {
                echo "❌ Pipeline failed"
                // Send Slack notification
                // slackSend(channel: '#deployments', message: "❌ Deployment failed for build #${BUILD_NUMBER}")
            }
        }
    }
}
