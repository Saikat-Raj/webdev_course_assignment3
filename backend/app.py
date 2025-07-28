from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_compress import Compress
from pymongo import MongoClient
from bson import ObjectId
import datetime
from datetime import timezone
import uuid
from dotenv import load_dotenv
import os
import time
import functools

# WEEK 4: Prometheus Monitoring Setup
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
import psutil

load_dotenv()

app = Flask(__name__)

# WEEK 4: PROMETHEUS METRICS CONFIGURATION
# Define Prometheus metrics for comprehensive monitoring

# REQUEST METRICS
request_count = Counter(
    'http_requests_total', 
    'Total HTTP requests', 
    ['method', 'endpoint', 'status_code']
)

request_latency = Histogram(
    'http_request_duration_seconds', 
    'HTTP request latency in seconds',
    ['method', 'endpoint']
)

# ERROR RATE METRICS  
error_count = Counter(
    'http_errors_total',
    'Total HTTP errors',
    ['method', 'endpoint', 'error_type']
)

# SYSTEM RESOURCE METRICS
cpu_usage = Gauge('system_cpu_usage_percent', 'Current CPU usage percentage')
memory_usage = Gauge('system_memory_usage_percent', 'Current memory usage percentage') 
memory_used_bytes = Gauge('system_memory_used_bytes', 'Current memory usage in bytes')
memory_total_bytes = Gauge('system_memory_total_bytes', 'Total system memory in bytes')

# APPLICATION METRICS
active_requests = Gauge('http_requests_active', 'Number of active HTTP requests')
database_operations = Counter('database_operations_total', 'Total database operations', ['operation', 'collection'])
database_latency = Histogram('database_operation_duration_seconds', 'Database operation latency', ['operation', 'collection'])

# SECURITY FIX 5: Suppress server version information
# Addresses OWASP ZAP finding: Server Leaks Version Information (Plugin ID: 10036)
from werkzeug.serving import WSGIRequestHandler
class NoServerHeaderRequestHandler(WSGIRequestHandler):
    def version_string(self):
        return ''
    
    def log_request(self, code='-', size='-'):
        # Optional: Suppress request logging for cleaner output
        pass

# SECURITY FIX 2: Secure CORS Configuration
# Replaced overly permissive CORS(*) with specific domain restrictions
# Previous vulnerability: Access-Control-Allow-Origin: * (ZAP Plugin ID: 10098)
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "http://localhost:3000",    # React development server
            "http://127.0.0.1:3000",    # Alternative localhost format
            "http://localhost:3001",    # React production build server
        ],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True,
        "max_age": 600  # Preflight cache duration (10 minutes)
    }
})

# OPTIMIZATION 3: RESPONSE COMPRESSION
# Baseline Issue: 309% bandwidth increase (93.52 → 382.68 KB/sec)
# Solution: Enable gzip compression for responses >1KB
# Expected Impact: 60-80% bandwidth reduction
# Performance Target: 20-30% response time improvement under load
compress = Compress(app)
compress.init_app(app)

# Configure compression settings
app.config['COMPRESS_MIMETYPES'] = [
    'text/html', 'text/css', 'text/xml', 'application/json',
    'application/javascript', 'text/javascript'
]
app.config['COMPRESS_LEVEL'] = 6  # Compression level (1-9, 6 is good balance)
app.config['COMPRESS_MIN_SIZE'] = 1024  # Only compress responses > 1KB

# OPTIMIZATION 4: MONGODB CONNECTION POOL
# Baseline Issue: Connection contention causing timing variability under load
# Solution: Optimize connection pool settings for concurrent access
# Expected Impact: 15-25% consistency improvement
# Performance Target: Reduce connection-related response time spikes

# MongoDB connection with optimized pool settings
MONGO_URI = os.getenv('MONGO_URI', 'mongodb+srv://saikat:saikatmediconnect@mediconnect.0iwks27.mongodb.net/')

client = MongoClient(
    MONGO_URI,
    # Connection Pool Optimization Settings
    maxPoolSize=20,                    # Maximum connections in pool (default: 100)
    minPoolSize=5,                     # Minimum connections to maintain (default: 0)
    maxIdleTimeMS=30000,               # Close idle connections after 30s (default: no limit)
    serverSelectionTimeoutMS=5000,     # Timeout for server selection (default: 30s)
    connectTimeoutMS=10000,            # Timeout for new connections (default: 20s)
    socketTimeoutMS=20000,             # Timeout for socket operations (default: no timeout)
    retryWrites=True,                  # Enable retryable writes for reliability
    retryReads=True,                   # Enable retryable reads for reliability
    # Performance optimizations
    compressors=['zlib'],              # Enable network compression
    zlibCompressionLevel=6             # Compression level for network traffic
)

db = client.assignment3_chat  # Use separate database for assignment
conversations_collection = db.conversations
messages_collection = db.messages

def create_database_indexes():
    """
    OPTIMIZATION 2: DATABASE INDEXING
    - Baseline Issue: 449% increase in performance variability (8.94ms → 49.11ms std dev)
    - Solution: Add compound indexes for frequently queried fields
    - Expected Impact: 30-40% performance improvement, <10ms std dev target
    - Performance Target: Reduce query execution time variability
    """
    try:
        print("Creating database indexes for performance optimization...")
        
        # INDEX 1: Messages query optimization
        # Baseline issue: Missing index for conversation_id + timestamp sorting
        # Used by: get_messages endpoint with .sort("timestamp", -1)
        messages_index = messages_collection.create_index([
            ("conversation_id", 1),  # Primary query field
            ("timestamp", -1)        # Sort field (descending for recent messages)
        ], name="conversation_timestamp_idx")
        print(f"✅ Created messages index: {messages_index}")
        
        # INDEX 2: Conversations query optimization  
        # Used by: get_conversations endpoint filtering by user emails
        conversations_index = conversations_collection.create_index([
            ("doctor_email", 1),
            ("patient_email", 1)
        ], name="users_conversation_idx")
        print(f"✅ Created conversations index: {conversations_index}")
        
        # INDEX 3: Message count optimization
        # Used by: count_documents in pagination
        message_count_index = messages_collection.create_index([
            ("conversation_id", 1)
        ], name="conversation_count_idx")
        print(f"✅ Created message count index: {message_count_index}")
        
        print("Database indexing optimization completed successfully!")
        
    except Exception as e:
        print(f"⚠️  Warning: Could not create database indexes: {e}")
        print("Application will continue without optimized indexes")

# Initialize database indexes on startup
create_database_indexes()

# Static users - no authentication needed for assignment
STATIC_USERS = {
    "patient": {
        "id": "patient_1",
        "email": "patient@example.com",
        "name": "John Patient",
        "role": "patient"
    },
    "doctor": {
        "id": "doctor_1", 
        "email": "doctor@example.com",
        "name": "Dr. Sarah Doctor",
        "role": "doctor"
    }
}

# SECURITY FIX 1: Content Security Policy and Security Headers Implementation
# Addresses OWASP ZAP findings: CSP Header Not Set (Plugin ID: 10038)
# Also fixes: X-Content-Type-Options Header Missing (Plugin ID: 10021)
@app.after_request
def add_security_headers(response):
    """
    Add comprehensive security headers to all responses
    Addresses multiple OWASP ZAP security findings:
    - CSP Header Not Set (Medium Severity)
    - X-Content-Type-Options Missing (Low Severity)
    """
    # Content Security Policy - Prevents XSS and data injection attacks
    # Fixed: CSP wildcard directive issue by restricting img-src
    csp_policy = (
        "default-src 'self'; "
        "script-src 'self' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; "
        "style-src 'self' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; "
        "font-src 'self' https://cdnjs.cloudflare.com; "
        "img-src 'self' data: https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; "
        "connect-src 'self' http://localhost:5001; "
        "frame-ancestors 'none'; "
        "form-action 'self'"
    )
    response.headers['Content-Security-Policy'] = csp_policy
    
    # Additional security headers for comprehensive protection
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    
    return response

# WEEK 4: PROMETHEUS MONITORING MIDDLEWARE AND FUNCTIONS

def update_system_metrics():
    """Update system resource metrics (CPU and Memory)"""
    # CPU Usage
    cpu_percent = psutil.cpu_percent(interval=0.1)
    cpu_usage.set(cpu_percent)
    
    # Memory Usage
    memory = psutil.virtual_memory()
    memory_usage.set(memory.percent)
    memory_used_bytes.set(memory.used)
    memory_total_bytes.set(memory.total)

def track_database_operation(operation, collection):
    """Decorator to track database operations"""
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                database_operations.labels(operation=operation, collection=collection).inc()
                return result
            except Exception as e:
                database_operations.labels(operation=f"{operation}_error", collection=collection).inc()
                raise
            finally:
                duration = time.time() - start_time
                database_latency.labels(operation=operation, collection=collection).observe(duration)
        return wrapper
    return decorator

@app.before_request
def before_request():
    """Track request start and update system metrics"""
    request.start_time = time.time()
    active_requests.inc()
    # Update system metrics on each request
    update_system_metrics()

@app.after_request
def after_request(response):
    """Track request completion, latency, and errors"""
    # Add security headers (existing functionality)
    csp_policy = (
        "default-src 'self'; "
        "script-src 'self' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; "
        "style-src 'self' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; "
        "font-src 'self' https://cdnjs.cloudflare.com; "
        "img-src 'self' data: https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; "
        "connect-src 'self' http://localhost:5001; "
        "frame-ancestors 'none'; "
        "form-action 'self'"
    )
    response.headers['Content-Security-Policy'] = csp_policy
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    
    # WEEK 4: Prometheus metrics collection
    if hasattr(request, 'start_time'):
        # Calculate request duration
        duration = time.time() - request.start_time
        
        # Get endpoint and method
        endpoint = request.endpoint or 'unknown'
        method = request.method
        status_code = str(response.status_code)
        
        # Track request count
        request_count.labels(method=method, endpoint=endpoint, status_code=status_code).inc()
        
        # Track request latency
        request_latency.labels(method=method, endpoint=endpoint).observe(duration)
        
        # Track errors (4xx and 5xx status codes)
        if response.status_code >= 400:
            error_type = 'client_error' if response.status_code < 500 else 'server_error'
            error_count.labels(method=method, endpoint=endpoint, error_type=error_type).inc()
        
        # Decrease active requests
        active_requests.dec()
    
    return response

# WEEK 4: Prometheus metrics endpoint
@app.route('/metrics')
def metrics():
    """Prometheus metrics endpoint for scraping"""
    # Update system metrics before serving
    update_system_metrics()
    return generate_latest(), 200, {'Content-Type': CONTENT_TYPE_LATEST}

# Helper function to find conversation between static users
def get_or_create_conversation():
    # Check if conversation already exists
    existing_conv = conversations_collection.find_one({
        "doctor_email": STATIC_USERS['doctor']['email'],
        "patient_email": STATIC_USERS['patient']['email']
    })
    
    if existing_conv:
        existing_conv['id'] = str(existing_conv['_id'])
        return existing_conv
    
    # Create new conversation
    conversation = {
        "doctor_email": STATIC_USERS['doctor']['email'],
        "patient_email": STATIC_USERS['patient']['email'],
        "created_at": datetime.datetime.now(timezone.utc),
        "last_message": "",
        "last_message_time": datetime.datetime.now(timezone.utc),
        "last_message_sender_email": "",
        "unread_count_doctor": 0,
        "unread_count_patient": 0
    }
    
    result = conversations_collection.insert_one(conversation)
    conversation['_id'] = result.inserted_id
    conversation['id'] = str(result.inserted_id)
    return conversation

@app.route('/api/get-static-users', methods=['GET'])
def get_static_users():
    """Get static users for the assignment"""
    return jsonify({"users": STATIC_USERS})

@app.route('/api/conversations', methods=['GET'])
def get_conversations():
    """Get conversations for current user (simplified for static users)"""
    user_type = request.args.get('user_type', 'patient')  # 'patient' or 'doctor'
    
    if user_type not in ['patient', 'doctor']:
        return jsonify({"error": "Invalid user type"}), 400
    
    # Get or create the single conversation between static users
    conversation = get_or_create_conversation()
    
    # Determine other user info
    if user_type == 'patient':
        other_user = STATIC_USERS['doctor']
    else:
        other_user = STATIC_USERS['patient']
    
    result = [{
        "id": conversation['id'],
        "conversation_id": conversation['id'],
        "other_user_name": other_user['name'],
        "other_user_email": other_user['email'],
        "other_user_role": other_user['role'],
        "last_message": conversation.get('last_message', ''),
        "last_message_time": conversation.get('last_message_time'),
        "last_message_sender_email": conversation.get('last_message_sender_email', ''),
        "unread_count": conversation.get(f'unread_count_{user_type}', 0)
    }]
    
    return jsonify({"conversations": result})

@app.route('/api/conversations/<conversation_id>/messages', methods=['GET'])
def get_messages(conversation_id):
    """Get messages for a conversation with pagination support
    
    OPTIMIZATION 1: MESSAGE PAGINATION
    - Baseline Issue: Response size 8.9KB → 38.8KB (334% increase under load)
    - Solution: Limit messages per request to reduce payload size
    - Expected Impact: 87% response size reduction (38.8KB → <5KB)
    - Performance Target: 50-70% response time improvement
    """
    user_type = request.args.get('user_type', 'patient')
    
    # PAGINATION PARAMETERS
    page = int(request.args.get('page', 1))  # Default to page 1
    limit = int(request.args.get('limit', 20))  # Limit to 20 messages per page
    
    # Calculate skip value for pagination
    skip = (page - 1) * limit
    
    try:
        # Find conversation
        conversation = conversations_collection.find_one({"_id": ObjectId(conversation_id)})
        if not conversation:
            return jsonify({"error": "Conversation not found"}), 404
        
        # OPTIMIZATION: Get paginated messages instead of all messages
        # Previous: Retrieved ALL messages causing 38.8KB responses
        # New: Retrieve only 'limit' messages starting from 'skip' offset
        messages_cursor = messages_collection.find({
            "conversation_id": ObjectId(conversation_id)
        }).sort("timestamp", -1).skip(skip).limit(limit)  # Most recent first
        
        # Get total count for pagination metadata
        total_messages = messages_collection.count_documents({
            "conversation_id": ObjectId(conversation_id)
        })
        
        result = []
        for msg in messages_cursor:
            sender = STATIC_USERS.get(msg.get('sender_type', 'patient'))
            result.append({
                "id": str(msg.get('_id')),
                "sender_email": sender.get('email', ''),
                "sender_name": sender.get('name', ''),
                "sender_role": sender.get('role', ''),
                "message": msg.get('message', ''),
                "timestamp": msg.get('timestamp'),
                "read": msg.get('read', False),
                "message_type": msg.get('message_type', 'text')
            })
        
        # Reverse to show chronological order (oldest first on current page)
        result.reverse()
        
        # Mark messages as read for current user
        conversations_collection.update_one(
            {"_id": ObjectId(conversation_id)},
            {"$set": {f"unread_count_{user_type}": 0}}
        )
        
        # PAGINATION METADATA
        pagination_info = {
            "current_page": page,
            "messages_per_page": limit,
            "total_messages": total_messages,
            "total_pages": (total_messages + limit - 1) // limit,  # Ceiling division
            "has_next": skip + limit < total_messages,
            "has_previous": page > 1
        }
        
        return jsonify({
            "messages": result,
            "pagination": pagination_info
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/conversations/<conversation_id>/send', methods=['POST'])
def send_message(conversation_id):
    """Send a message in a conversation"""
    data = request.get_json()
    message_text = data.get('message', '')
    sender_type = data.get('sender_type', 'patient')  # 'patient' or 'doctor'
    
    if not message_text:
        return jsonify({"error": "Message cannot be empty"}), 400
    
    if sender_type not in ['patient', 'doctor']:
        return jsonify({"error": "Invalid sender type"}), 400
    
    try:
        # Find conversation
        conversation = conversations_collection.find_one({"_id": ObjectId(conversation_id)})
        if not conversation:
            return jsonify({"error": "Conversation not found"}), 404
        
        sender = STATIC_USERS[sender_type]
        
        # Create message
        message_doc = {
            "conversation_id": ObjectId(conversation_id),
            "sender_email": sender['email'],
            "sender_type": sender_type,
            "sender_role": sender['role'],
            "message": message_text,
            "timestamp": datetime.datetime.now(timezone.utc),
            "read": False,
            "message_type": "text"
        }
        
        messages_collection.insert_one(message_doc)
        
        # Update conversation with last message
        other_type = 'patient' if sender_type == 'doctor' else 'doctor'
        conversations_collection.update_one(
            {"_id": ObjectId(conversation_id)},
            {
                "$set": {
                    "last_message": message_text,
                    "last_message_time": datetime.datetime.now(timezone.utc),
                    "last_message_sender_email": sender['email']
                },
                "$inc": {f"unread_count_{other_type}": 1}
            }
        )
        
        return jsonify({"message": "Message sent successfully"}), 201
    
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/conversations/start', methods=['POST'])
def start_conversation():
    """Start or get existing conversation between static users"""
    # Just return the existing conversation
    conversation = get_or_create_conversation()
    
    return jsonify({
        "conversation_id": conversation['id'],
        "message": "Conversation ready"
    }), 200

if __name__ == "__main__":
    # Use custom request handler to suppress server headers
    app.run(debug=True, host='0.0.0.0', port=5001, request_handler=NoServerHeaderRequestHandler)