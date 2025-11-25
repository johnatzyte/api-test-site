document.addEventListener('DOMContentLoaded', () => {
    const productList = document.getElementById('product-list');
    const productDetail = document.getElementById('product-detail');

    if (productList) {
        loadProducts(1);
    }

    if (productDetail) {
        loadProductDetail();
    }
});

async function loadProducts(page = 1) {
    try {
        const response = await fetch(`/api/products?page=${page}&limit=8`);
        const data = await response.json();
        renderProductList(data.products);
        renderPagination(data);
    } catch (error) {
        console.error('Error loading products:', error);
        document.getElementById('product-list').innerHTML = '<p>Error loading products.</p>';
    }
}

function renderProductList(products) {
    const container = document.getElementById('product-list');
    container.innerHTML = '';

    products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <img src="${product.image_url}" alt="${product.name}" class="product-image">
            <div class="product-info">
                <h3>${product.name}</h3>
                <p class="price">${product.currency} ${product.price.toFixed(2)}</p>
                <a href="/product/${product.id}" class="btn">View Details</a>
            </div>
        `;
        container.appendChild(card);
    });
}

function renderPagination(data) {
    const container = document.getElementById('pagination');
    if (!container) return;
    
    container.innerHTML = '';
    
    const { current_page, total_pages } = data;
    
    if (total_pages <= 1) return;

    // Previous Button
    const prevBtn = document.createElement('button');
    prevBtn.innerText = 'Previous';
    prevBtn.disabled = current_page === 1;
    prevBtn.onclick = () => loadProducts(current_page - 1);
    container.appendChild(prevBtn);

    // Page Numbers
    for (let i = 1; i <= total_pages; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.innerText = i;
        if (i === current_page) {
            pageBtn.classList.add('active');
        }
        pageBtn.onclick = () => loadProducts(i);
        container.appendChild(pageBtn);
    }

    // Next Button
    const nextBtn = document.createElement('button');
    nextBtn.innerText = 'Next';
    nextBtn.disabled = current_page === total_pages;
    nextBtn.onclick = () => loadProducts(current_page + 1);
    container.appendChild(nextBtn);
}

async function loadProductDetail() {
    // Extract ID from URL: /product/<id>
    const pathParts = window.location.pathname.split('/');
    const productId = pathParts[pathParts.length - 1];

    try {
        const response = await fetch(`/api/products/${productId}`);
        if (!response.ok) {
            throw new Error('Product not found');
        }
        const product = await response.json();
        renderProductDetail(product);
    } catch (error) {
        console.error('Error loading product:', error);
        document.getElementById('product-detail').innerHTML = '<p>Product not found.</p>';
    }
}

function renderProductDetail(product) {
    const container = document.getElementById('product-detail');
    
    // Format compatibility list
    const compatibilityList = product.compatibility.map(item => `<li>${item}</li>`).join('');

    container.innerHTML = `
        <div class="detail-image">
            <img src="${product.image_url}" alt="${product.name}">
        </div>
        <div class="detail-info">
            <h2>${product.name}</h2>
            <p class="price-large">${product.currency} ${product.price.toFixed(2)}</p>
            <p class="description">${product.description}</p>
            
            <div class="specs">
                <h3>Specifications</h3>
                <ul>
                    <li><strong>Category:</strong> ${product.category}</li>
                    <li><strong>Manufacturer:</strong> ${product.manufacturer}</li>
                    <li><strong>Part Number:</strong> ${product.part_number}</li>
                    <li><strong>Stock:</strong> ${product.stock_quantity} units</li>
                    <li><strong>Weight:</strong> ${product.weight}</li>
                    <li><strong>Dimensions:</strong> ${product.dimensions}</li>
                    <li><strong>Rating:</strong> ${product.rating} / 5.0</li>
                </ul>
            </div>

            <div class="compatibility">
                <h3>Compatibility</h3>
                <ul>
                    ${compatibilityList}
                </ul>
            </div>
        </div>
    `;
}
