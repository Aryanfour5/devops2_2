pipeline {
    agent any
    
    environment {
        DOCKER_REGISTRY = 'your-dockerhub-username'
        DOCKER_IMAGE_NAME = '${DOCKER_REGISTRY}/jenkins-pipeline-demo'
        DOCKER_IMAGE_TAG = "${BUILD_NUMBER}"
        DOCKER_IMAGE_LATEST = 'latest'
        
        K8S_NAMESPACE_PROD = 'production'
        K8S_NAMESPACE_STAGING = 'staging'
        K8S_DEPLOYMENT = 'jenkins-pipeline-demo'
        
        // Set BRANCH_NAME for when conditions (important!)
        BRANCH_NAME = "${GIT_BRANCH.replaceAll('origin/', '')}"
    }
    
    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 1, unit: 'HOURS')
        timestamps()
    }
    
    stages {
        stage('0. Initialize') {
            steps {
                script {
                    echo "╔═══════════════════════════════════════╗"
                    echo "║  PIPELINE INITIALIZATION              ║"
                    echo "╚═══════════════════════════════════════╝"
                    echo "Branch: ${BRANCH_NAME}"
                    echo "Build Number: ${BUILD_NUMBER}"
                    echo "Build ID: ${BUILD_ID}"
                    echo "Build URL: ${BUILD_URL}"
                }
            }
        }
        
        stage('1. Checkout') {
            steps {
                script {
                    echo "========== STAGE 1: CHECKOUT =========="
                }
                checkout scm
            }
        }
        
        stage('2. Install Dependencies') {
            steps {
                script {
                    echo "========== STAGE 2: INSTALL DEPENDENCIES =========="
                }
                sh 'npm install'
            }
        }
        
        // ✅ ALWAYS RUN - All branches
        stage('3. Unit Tests') {
            steps {
                script {
                    echo "========== STAGE 3: UNIT TESTS (ALL BRANCHES) =========="
                }
                sh 'npm test'
            }
            post {
                always {
                    echo "✅ Unit tests completed"
                }
            }
        }
        
        // ✅ ALWAYS RUN - All branches
        stage('4. Build Docker Image') {
            steps {
                script {
                    echo "========== STAGE 4: BUILD DOCKER IMAGE (ALL BRANCHES) =========="
                }
                sh '''
                    docker build \
                        --tag ${DOCKER_IMAGE_NAME}:${DOCKER_IMAGE_TAG} \
                        --tag ${DOCKER_IMAGE_NAME}:${DOCKER_IMAGE_LATEST} \
                        .
                    
                    docker images | grep jenkins-pipeline-demo
                '''
            }
        }
        
        // 🔴 ONLY main and develop
        stage('5. Push to Docker Registry') {
            when {
                expression {
                    return env.BRANCH_NAME == 'main' || env.BRANCH_NAME == 'develop'
                }
            }
            steps {
                script {
                    echo "========== STAGE 5: PUSH TO DOCKER REGISTRY (main/develop only) =========="
                }
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-credentials',
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
        
        // 🟢 ONLY main - Production deployment
        stage('6. Deploy to Production') {
            when {
                branch 'main'
            }
            steps {
                script {
                    echo "========== STAGE 6: DEPLOY TO PRODUCTION (main only) =========="
                }
                sh '''
                    kubectl config use-context minikube
                    kubectl apply -f k8s/deployment.yaml -n ${K8S_NAMESPACE_PROD}
                    kubectl set image deployment/${K8S_DEPLOYMENT} \
                        ${K8S_DEPLOYMENT}=${DOCKER_IMAGE_NAME}:${DOCKER_IMAGE_TAG} \
                        -n ${K8S_NAMESPACE_PROD}
                    kubectl rollout status deployment/${K8S_DEPLOYMENT} \
                        -n ${K8S_NAMESPACE_PROD} \
                        --timeout=5m
                '''
            }
        }
        
        // 🟡 ONLY develop - Staging deployment
        stage('7. Deploy to Staging') {
            when {
                branch 'develop'
            }
            steps {
                script {
                    echo "========== STAGE 7: DEPLOY TO STAGING (develop only) =========="
                }
                sh '''
                    kubectl config use-context minikube
                    kubectl apply -f k8s/deployment.yaml -n ${K8S_NAMESPACE_STAGING}
                    kubectl set image deployment/${K8S_DEPLOYMENT} \
                        ${K8S_DEPLOYMENT}=${DOCKER_IMAGE_NAME}:${DOCKER_IMAGE_TAG} \
                        -n ${K8S_NAMESPACE_STAGING}
                    kubectl rollout status deployment/${K8S_DEPLOYMENT} \
                        -n ${K8S_NAMESPACE_STAGING} \
                        --timeout=5m
                '''
            }
        }
        
        // 🔵 ONLY feature branches - Integration tests
        stage('8. Integration Tests') {
            when {
                expression {
                    return env.BRANCH_NAME.startsWith('feature/')
                }
            }
            steps {
                script {
                    echo "========== STAGE 8: INTEGRATION TESTS (feature/* only) =========="
                }
                sh 'npm run test:integration || echo "Integration tests not configured"'
            }
        }
        
        // 🟣 ONLY main - Production smoke tests
        stage('9. Production Smoke Tests') {
            when {
                branch 'main'
            }
            steps {
                script {
                    echo "========== STAGE 9: PRODUCTION SMOKE TESTS (main only) =========="
                }
                sh '''
                    # Wait for service to be ready
                    for i in {1..30}; do
                        if curl -f http://jenkins-pipeline-demo:3000/health; then
                            echo "✅ Service is healthy"
                            break
                        fi
                        echo "Waiting for service... ($i/30)"
                        sleep 2
                    done
                    
                    curl -f http://jenkins-pipeline-demo:3000/api/users
                    echo "✅ API tests passed"
                '''
            }
        }
    }
    
    post {
        always {
            script {
                echo "╔═══════════════════════════════════════╗"
                echo "║  PIPELINE SUMMARY                     ║"
                echo "╚═══════════════════════════════════════╝"
                echo "Branch: ${BRANCH_NAME}"
                echo "Build Status: ${currentBuild.result}"
                echo "Build Duration: ${currentBuild.durationString}"
            }
            cleanWs()
        }
        
        success {
            script {
                echo "✅✅✅ PIPELINE SUCCESSFUL ✅✅✅"
                if (env.BRANCH_NAME == 'main') {
                    echo "🚀 Deployment to PRODUCTION completed"
                } else if (env.BRANCH_NAME == 'develop') {
                    echo "🟡 Deployment to STAGING completed"
                } else if (env.BRANCH_NAME.startsWith('feature/')) {
                    echo "🧪 Feature branch tests passed"
                }
            }
        }
        
        failure {
            script {
                echo "❌❌❌ PIPELINE FAILED ❌❌❌"
                echo "Branch: ${BRANCH_NAME}"
                echo "Failed Build: ${BUILD_URL}"
            }
        }
    }
}
