#!/usr/bin/env python3
"""
Manual file upload test script for debugging MinIO 403 errors
Usage: python test_upload.py <presigned_url>
"""

import requests
import sys
import os

def test_upload(presigned_url):
    """Test upload using a presigned URL"""
    
    # Create a simple test file
    test_content = b"This is a test file for MinIO upload"
    
    print(f"Testing upload to: {presigned_url}")
    print(f"Content length: {len(test_content)} bytes")
    print(f"Content type: text/plain")
    print("=" * 60)
    
    try:
        response = requests.put(
            presigned_url,
            data=test_content,
            headers={
                'Content-Type': 'text/plain'
            },
            timeout=30
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            print("✅ SUCCESS: Upload completed successfully!")
            return True
        else:
            print("❌ FAILED: Upload failed")
            print(f"Response Text: {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ REQUEST ERROR: {e}")
        return False

def main():
    if len(sys.argv) != 2:
        print("Usage: python test_upload.py <presigned_url>")
        print("Example: python test_upload.py 'http://localhost:9000/pms-files/test/abc.txt?...'")
        sys.exit(1)
    
    presigned_url = sys.argv[1]
    success = test_upload(presigned_url)
    
    if success:
        print("\n🎉 Upload test PASSED!")
        print("The MinIO configuration is working correctly.")
        print("If frontend uploads are still failing, check:")
        print("1. CORS configuration on MinIO")
        print("2. File content-type headers")
        print("3. File size limits")
        print("4. Network connectivity from browser")
    else:
        print("\n💥 Upload test FAILED!")
        print("This indicates a MinIO configuration issue.")
        print("Check:")
        print("1. MinIO server is running")
        print("2. Bucket exists and has proper policies")
        print("3. Presigned URL is not expired")
        print("4. MinIO credentials are correct")
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()