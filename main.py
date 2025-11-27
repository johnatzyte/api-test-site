import json
from flask import Flask, jsonify, render_template, abort, request
from flask_cors import CORS
from werkzeug.middleware.proxy_fix import ProxyFix
import math
import uuid
import logging
import hashlib
import hmac

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

SECRET_KEY = b'super-secret-key-change-this-in-prod'

app = Flask(__name__)
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_port=1)

def generate_token(ip_address):
    token_id = str(uuid.uuid4())
    # Create a signature binding the token ID to the IP address
    msg = f"{token_id}:{ip_address}".encode('utf-8')
    signature = hmac.new(SECRET_KEY, msg, hashlib.sha256).hexdigest()
    return f"{token_id}:{signature}"

def validate_token(token_str, ip_address):
    if not token_str or ':' not in token_str:
        return False
    
    try:
        token_id, signature = token_str.split(':', 1)
        msg = f"{token_id}:{ip_address}".encode('utf-8')
        expected_signature = hmac.new(SECRET_KEY, msg, hashlib.sha256).hexdigest()
        return hmac.compare_digest(signature, expected_signature)
    except Exception:
        return False

# Allow CORS for all origins on API routes to support VPS/remote access
CORS(app, resources={r"/api/*": {"origins": "*"}})

@app.before_request
def restrict_api_access():
    # Check if the request is for the API
    if request.path.startswith('/api/'):
        # Check User-Agent for browser-like string
        ua = request.user_agent.string
        if not ua or 'Mozilla' not in ua:
            logger.warning(f"Blocked API access due to User-Agent: {ua}")
            abort(403, description="Forbidden")

        # Check if the Referer header is present and matches the host
        # This ensures the request is coming from our frontend pages
        referer = request.headers.get('Referer')
        if not referer or request.host not in referer:
            logger.warning(f"Blocked API access due to Referer mismatch. Host: {request.host}, Referer: {referer}")
            abort(403, description="Forbidden")

        # Check for Auth Token cookie and validate IP binding
        token = request.cookies.get('AUTH_TOKEN')
        
        # Debug logging to troubleshoot IP binding
        logger.info(f"Validating request from IP: {request.remote_addr} (X-Forwarded-For: {request.headers.get('X-Forwarded-For')})")
        
        if not token or not validate_token(token, request.remote_addr):
            logger.warning(f"Blocked API access due to invalid/missing Auth Token or IP mismatch. IP: {request.remote_addr}")
            abort(403, description="Forbidden: Invalid Auth Token")
    
    # Check if it's a page request (not API, not static, not verify)
    elif not request.path.startswith('/static/') and request.path != '/verify-challenge' and request.path != '/favicon.ico':
        # If cookie is missing or invalid, serve challenge
        token = request.cookies.get('AUTH_TOKEN')
        if not token or not validate_token(token, request.remote_addr):
            logger.info(f"Missing or invalid Auth Token for {request.path} (IP: {request.remote_addr}), serving challenge")
            return render_template('challenge.html', next_url=request.url)

@app.route('/verify-challenge', methods=['POST'])
def verify_challenge():
    try:
        data = request.get_json(silent=True)
        
        if not data:
            logger.error("Challenge failed: No JSON data received")
            abort(400, description="Invalid Request")
            
        is_webdriver = data.get('webdriver')
        is_playwright = data.get('playwright')
        next_url = data.get('next', '/')
        gpu_info = data.get('gpu')
        font_info = data.get('fonts')
        
        logger.info(f"Challenge verification attempt. Webdriver: {is_webdriver}, Playwright: {is_playwright}")
        if gpu_info:
            logger.info(f"Client GPU Info: {gpu_info}")
            # Check for SwiftShader (headless/software rendering)
            renderer = gpu_info.get('renderer', '')
            vendor = gpu_info.get('vendor', '')
            if 'SwiftShader' in renderer or 'SwiftShader' in vendor:
                logger.warning(f"Challenge failed: Bot Detected (SwiftShader GPU: {renderer})")
                abort(403, description="Forbidden: Bot Detected (GPU)")

        if font_info:
            logger.info(f"Client Font Info: {font_info}")

        # Check if webdriver is false (or undefined/None which we treat as passing for now)
        # If it is explicitly True, we fail.
        if is_webdriver is True:
            logger.warning("Challenge failed: Bot Detected (webdriver=True)")
            abort(403, description="Forbidden: Bot Detected")

        if is_playwright is True:
            logger.warning("Challenge failed: Bot Detected (Playwright bindings)")
            abort(403, description="Forbidden: Bot Detected (Playwright)")
            
        logger.info("Challenge passed. Issuing Auth Token.")
        resp = jsonify({'status': 'success', 'redirect': next_url})
        
        # Determine if we should use Secure cookies (if request is HTTPS)
        is_secure = request.scheme == 'https'
        
        # Generate IP-bound token
        logger.info(f"Generating token for IP: {request.remote_addr}")
        auth_token = generate_token(request.remote_addr)
        
        resp.set_cookie('AUTH_TOKEN', auth_token, httponly=True, samesite='Lax', secure=is_secure, max_age=300)
        return resp
    except Exception as e:
        logger.error(f"Error in verify_challenge: {str(e)}")
        abort(500)

def load_products():
    with open('products.json', 'r') as f:
        return json.load(f)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/product/<id>')
def product_detail(id):
    return render_template('product.html')

@app.route('/api/products')
def get_products():
    logger.info("API: Fetching products list")
    products = load_products()
    
    # Pagination logic
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 8, type=int)
    
    total_products = len(products)
    total_pages = math.ceil(total_products / limit)
    
    start_index = (page - 1) * limit
    end_index = start_index + limit
    
    paginated_products = products[start_index:end_index]
    
    return jsonify({
        'products': paginated_products,
        'total_products': total_products,
        'total_pages': total_pages,
        'current_page': page,
        'limit': limit
    })

@app.route('/api/products/<id>')
def get_product(id):
    logger.info(f"API: Fetching product {id}")
    products = load_products()
    product = next((p for p in products if p['id'] == id), None)
    if product:
        return jsonify(product)
    logger.warning(f"API: Product {id} not found")
    abort(404)

if __name__ == "__main__":
    app.run(debug=True, port=5001)
