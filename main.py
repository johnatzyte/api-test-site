import json
from flask import Flask, jsonify, render_template, abort, request
from flask_cors import CORS
# from werkzeug.middleware.proxy_fix import ProxyFix # Temporarily disabled
import math
import uuid
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
# app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_port=1) # Temporarily disabled

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
        # Trust X-Forwarded-Host if present (for Caddy), otherwise use Host
        host = request.headers.get('X-Forwarded-Host', request.host)
        
        if not referer or host not in referer:
            logger.warning(f"Blocked API access due to Referer mismatch. Host: {host}, Referer: {referer}")
            abort(403, description="Forbidden")

        # Check for Auth Token cookie
        if not request.cookies.get('AUTH_TOKEN'):
            logger.warning("Blocked API access due to missing Auth Token")
            abort(403, description="Forbidden: Missing Auth Token")
    
    # Check if it's a page request (not API, not static, not verify)
    elif not request.path.startswith('/static/') and request.path != '/verify-challenge' and request.path != '/favicon.ico':
        # If cookie is missing, serve challenge
        if not request.cookies.get('AUTH_TOKEN'):
            logger.info(f"Missing Auth Token for {request.path}, serving challenge")
            return render_template('challenge.html', next_url=request.url)

@app.route('/verify-challenge', methods=['POST'])
def verify_challenge():
    try:
        # Log headers to debug potential proxy/stripping issues
        logger.info(f"Verify Challenge Headers: {dict(request.headers)}")
        
        # Try to read data using get_data() which handles caching
        raw_data = request.get_data()
        logger.info(f"Verify Challenge Raw Data: {raw_data}")

        data = None
        if raw_data:
            try:
                data = json.loads(raw_data)
            except Exception as e:
                logger.error(f"JSON parse error: {e}")

        if not data:
            # If data is still empty, check if it was parsed as form data (unlikely but possible)
            if request.form:
                data = request.form.to_dict()
            else:
                logger.error(f"Challenge failed: No data received. Content-Length: {request.content_length}")
                abort(400, description="Invalid Request: Empty Body")
            
        is_webdriver = data.get('webdriver')
        next_url = data.get('next', '/')
        
        logger.info(f"Challenge verification attempt. Webdriver: {is_webdriver}")

        # Check if webdriver is false (or undefined/None which we treat as passing for now)
        # If it is explicitly True, we fail.
        if is_webdriver is True:
            logger.warning("Challenge failed: Bot Detected (webdriver=True)")
            abort(403, description="Forbidden: Bot Detected")
            
        logger.info("Challenge passed. Issuing Auth Token.")
        resp = jsonify({'status': 'success', 'redirect': next_url})
        
        # Determine if we should use Secure cookies (if request is HTTPS)
        is_secure = request.scheme == 'https'
        resp.set_cookie('AUTH_TOKEN', str(uuid.uuid4()), httponly=True, samesite='Lax', secure=is_secure)
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
