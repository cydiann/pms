#!/bin/bash

echo "🧪 Running PMS Test Suite"
echo "========================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to run tests
run_test_module() {
    module_name=$1
    description=$2
    
    echo -e "\n${YELLOW}📋 Running: $description${NC}"
    echo "-----------------------------------"
    
    # Check if running inside container (no docker-compose needed)
    if [ -f "/.dockerenv" ]; then
        python manage.py test $module_name --verbosity=2
    else
        docker-compose exec app python manage.py test $module_name --verbosity=2
    fi
    
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
    
    # Check if running inside container (no docker-compose needed)
    if [ -f "/.dockerenv" ]; then
        python manage.py test $test_class --verbosity=2
    else
        docker-compose exec app python manage.py test $test_class --verbosity=2
    fi
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $description - PASSED${NC}"
    else
        echo -e "${RED}❌ $description - FAILED${NC}"
        return 1
    fi
}

# Check if specific test module is requested
case "$1" in
    "auth"|"authentication")
        run_test_module "authentication.tests" "Authentication Module Tests"
        ;;
    "org"|"organization")
        run_test_module "organization.tests" "Organization Module Tests"
        ;;
    "req"|"requests")
        run_test_module "requests.tests" "Requests Module Tests"
        ;;
    "core")
        run_test_module "core.tests" "Core Module Tests"
        ;;
    "models")
        echo -e "${YELLOW}🗄️ Model Tests${NC}"
        echo "Running all model tests..."
        
        run_test_class "authentication.tests.test_models" "User Model Tests" || exit 1
        run_test_class "organization.tests.test_models" "Organization Model Tests" || exit 1
        run_test_class "requests.tests.test_models" "Request Model Tests" || exit 1
        
        echo -e "\n${GREEN}🎉 All model tests completed!${NC}"
        ;;
    "views"|"api")
        echo -e "${YELLOW}🌐 API/View Tests${NC}"
        echo "Running all view tests..."
        
        run_test_class "authentication.tests.test_views" "Authentication API Tests" || exit 1
        run_test_class "organization.tests.test_views" "Organization API Tests" || exit 1
        run_test_class "requests.tests.test_views" "Requests API Tests" || exit 1
        run_test_class "core.tests.test_views" "Core API Tests" || exit 1
        
        echo -e "\n${GREEN}🎉 All API tests completed!${NC}"
        ;;
    "quick")
        echo -e "${YELLOW}🚀 Quick Test Suite${NC}"
        echo "Running essential tests..."
        
        run_test_class "authentication.tests.test_models.UserModelTest" "User Model Tests"
        run_test_class "organization.tests.test_models.WorksiteModelTest" "Worksite Model Tests"
        run_test_class "requests.tests.test_models.RequestModelTest" "Request Model Tests"
        run_test_class "authentication.tests.test_views.UserViewSetTest" "User API Tests"
        
        echo -e "\n${GREEN}🎉 Quick test suite completed successfully!${NC}"
        ;;
    "all"|"")
        echo -e "${YELLOW}🧪 Complete Test Suite${NC}"
        echo "Running all test modules..."
        
        # Track failures
        failed_tests=0
        
        run_test_module "authentication.tests" "Authentication Module Tests" || ((failed_tests++))
        run_test_module "organization.tests" "Organization Module Tests" || ((failed_tests++))
        run_test_module "requests.tests" "Requests Module Tests" || ((failed_tests++))
        run_test_module "core.tests" "Core Module Tests" || ((failed_tests++))
        
        echo -e "\n========================="
        if [ $failed_tests -eq 0 ]; then
            echo -e "${GREEN}🎉 All tests passed! (0 failures)${NC}"
            exit 0
        else
            echo -e "${RED}💥 $failed_tests test module(s) failed${NC}"
            exit 1
        fi
        ;;
    "coverage")
        echo -e "${YELLOW}📊 Running tests with coverage${NC}"
        echo "Installing coverage if needed..."
        
        # Check if running inside container
        if [ -f "/.dockerenv" ]; then
            pip install coverage > /dev/null 2>&1
            echo "Running tests with coverage analysis..."
            coverage run --source='.' manage.py test authentication.tests organization.tests requests.tests core.tests --verbosity=2
            echo -e "\n${BLUE}📈 Coverage Report:${NC}"
            coverage report
            echo -e "\n${BLUE}📄 Generating HTML coverage report...${NC}"
            coverage html
        else
            docker-compose exec app pip install coverage > /dev/null 2>&1
            echo "Running tests with coverage analysis..."
            docker-compose exec app coverage run --source='.' manage.py test authentication.tests organization.tests requests.tests core.tests --verbosity=2
            echo -e "\n${BLUE}📈 Coverage Report:${NC}"
            docker-compose exec app coverage report
            echo -e "\n${BLUE}📄 Generating HTML coverage report...${NC}"
            docker-compose exec app coverage html
        fi
        echo "📄 Coverage report generated in htmlcov/index.html"
        ;;
    "help")
        echo "Usage: $0 [test_type]"
        echo ""
        echo "Test types:"
        echo "  auth        - Run authentication module tests"
        echo "  org         - Run organization module tests"
        echo "  requests    - Run requests module tests"
        echo "  core        - Run core module tests"
        echo "  models      - Run all model tests"
        echo "  views       - Run all API/view tests"
        echo "  quick       - Run essential tests only (faster)"
        echo "  all         - Run complete test suite (default)"
        echo "  coverage    - Run tests with coverage report"
        echo "  help        - Show this help"
        echo ""
        echo "Examples:"
        echo "  $0              # Run all tests"
        echo "  $0 quick        # Run quick test suite"
        echo "  $0 auth         # Run only authentication tests"
        echo "  $0 models       # Run only model tests"
        echo "  $0 coverage     # Run with coverage"
        ;;
    *)
        echo -e "${RED}❌ Unknown test type: $1${NC}"
        echo "Use '$0 help' to see available options"
        exit 1
        ;;
esac