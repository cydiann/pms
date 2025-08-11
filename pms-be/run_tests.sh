#!/bin/bash

echo "🧪 Running PMS Test Suite"
echo "========================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to run tests
run_test_module() {
    module_name=$1
    description=$2
    
    echo -e "\n${YELLOW}📋 Running: $description${NC}"
    echo "-----------------------------------"
    
    docker-compose exec app python manage.py test tests.$module_name --verbosity=2
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $description - PASSED${NC}"
    else
        echo -e "${RED}❌ $description - FAILED${NC}"
        return 1
    fi
}

# Function to run specific test class
run_test_class() {
    test_class=$1
    description=$2
    
    echo -e "\n${YELLOW}🎯 Running: $description${NC}"
    echo "-----------------------------------"
    
    docker-compose exec app python manage.py test $test_class --verbosity=2
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $description - PASSED${NC}"
    else
        echo -e "${RED}❌ $description - FAILED${NC}"
        return 1
    fi
}

# Check if specific test module is requested
case "$1" in
    "models")
        run_test_module "test_models" "Model Tests"
        ;;
    "auth")
        run_test_module "test_authentication_views" "Authentication API Tests"
        ;;
    "requests")
        run_test_module "test_request_scenarios" "Request Workflow Tests"
        ;;
    "api")
        run_test_module "test_api_endpoints" "API Endpoint Tests"
        ;;
    "basic")
        run_test_module "test_basic_api" "Basic API Tests"
        ;;
    "permissions")
        run_test_module "test_permissions" "Permission System Tests"
        ;;
    "quick")
        echo -e "${YELLOW}🚀 Quick Test Suite${NC}"
        echo "Running essential tests..."
        
        run_test_class "tests.test_models.UserModelTests" "User Model Tests" || exit 1
        run_test_class "tests.test_models.RequestModelTests" "Request Model Tests" || exit 1
        run_test_class "tests.test_basic_api.BasicAPITests" "Basic API Tests" || exit 1
        run_test_class "tests.test_basic_api.WorksiteAPITests" "Worksite Tests" || exit 1
        
        echo -e "\n${GREEN}🎉 Quick test suite completed successfully!${NC}"
        ;;
    "all"|"")
        echo -e "${YELLOW}🧪 Complete Test Suite${NC}"
        echo "Running all test modules..."
        
        # Track failures
        failed_tests=0
        
        run_test_module "test_models" "Model Layer Tests" || ((failed_tests++))
        run_test_module "test_authentication_views" "Authentication API Tests" || ((failed_tests++))
        run_test_module "test_request_scenarios" "Request Workflow Scenarios" || ((failed_tests++))
        run_test_module "test_api_endpoints" "API Endpoint Tests" || ((failed_tests++))
        run_test_module "test_permissions" "Permission System Tests" || ((failed_tests++))
        
        echo -e "\n========================="
        if [ $failed_tests -eq 0 ]; then
            echo -e "${GREEN}🎉 All tests passed! ($failed_tests failures)${NC}"
            exit 0
        else
            echo -e "${RED}💥 $failed_tests test module(s) failed${NC}"
            exit 1
        fi
        ;;
    "coverage")
        echo -e "${YELLOW}📊 Running tests with coverage${NC}"
        docker-compose exec app python -m pytest tests/ --cov=. --cov-report=html --cov-report=term
        echo "📄 Coverage report generated in htmlcov/index.html"
        ;;
    "help")
        echo "Usage: $0 [test_type]"
        echo ""
        echo "Test types:"
        echo "  models      - Run model tests only"
        echo "  auth        - Run authentication tests only"
        echo "  requests    - Run request workflow tests only"
        echo "  api         - Run API endpoint tests only"
        echo "  basic       - Run basic API tests only (working alternative)"
        echo "  permissions - Run permission system tests only"
        echo "  quick       - Run essential tests only (faster)"
        echo "  all         - Run complete test suite (default)"
        echo "  coverage    - Run tests with coverage report"
        echo "  help        - Show this help"
        echo ""
        echo "Examples:"
        echo "  $0              # Run all tests"
        echo "  $0 quick        # Run quick test suite"
        echo "  $0 models       # Run only model tests"
        echo "  $0 coverage     # Run with coverage"
        ;;
    *)
        echo -e "${RED}❌ Unknown test type: $1${NC}"
        echo "Use '$0 help' to see available options"
        exit 1
        ;;
esac