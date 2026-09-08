const selectedProducts = new Map();
const MAX_COMPARISON_PRODUCTS = 3;

document.addEventListener('DOMContentLoaded', () => {
    const productList = document.getElementById('product-list');
    const productDetail = document.getElementById('product-detail');

    if (productList) {
        const searchForm = document.getElementById('search-form');
        searchForm.addEventListener('submit', event => {
            event.preventDefault();
            loadProducts(1, getFilters());
        });
        loadProducts(1);

        document.getElementById('compare-button').addEventListener('click', renderComparison);
        document.getElementById('clear-comparison').addEventListener('click', () => {
            selectedProducts.clear();
            updateComparisonPanel();
            loadProducts(1, getFilters());
        });
        document.getElementById('close-comparison').addEventListener('click', () => {
            document.getElementById('comparison-view').hidden = true;
        });
    }

    if (productDetail) {
        loadProductDetail();
    }
});

let activeFilters = { q: '', category: '', sort: 'relevance', in_stock: false };

function getFilters() {
    return {
        q: document.getElementById('product-search').value.trim(),
        category: document.getElementById('category-filter').value,
        sort: document.getElementById('sort-products').value,
        in_stock: document.getElementById('in-stock-filter').checked
    };
}

async function loadProducts(page = 1, filters = activeFilters) {
    try {
        activeFilters = { ...filters };
        const params = new URLSearchParams({ page, limit: 8 });
        if (activeFilters.q) params.set('q', activeFilters.q);
        if (activeFilters.category) params.set('category', activeFilters.category);
        if (activeFilters.sort !== 'relevance') params.set('sort', activeFilters.sort);
        if (activeFilters.in_stock) params.set('in_stock', 'true');

        const response = await fetch(`/api/products?${params}`);
        const data = await response.json();
        populateCategories(data.categories);
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
                <p class="sku">SKU: ${product.part_number}</p>
                <p class="price">${product.currency} ${product.price.toFixed(2)}</p>
                <a href="/product/${product.id}" class="btn">View Details</a>
                <label class="compare-option">
                    <input type="checkbox" data-product-id="${product.id}" ${selectedProducts.has(product.id) ? 'checked' : ''}>
                    Compare
                </label>
            </div>
        `;
        card.querySelector('input').addEventListener('change', event => {
            if (event.target.checked) {
                if (selectedProducts.size >= MAX_COMPARISON_PRODUCTS) {
                    event.target.checked = false;
                    return;
                }
                selectedProducts.set(product.id, product);
            } else {
                selectedProducts.delete(product.id);
            }
            updateComparisonPanel();
        });
        container.appendChild(card);
    });

    if (products.length === 0) {
        container.innerHTML = '<p class="empty-state">No products found. Try a different name or SKU.</p>';
    }
}

function populateCategories(categories) {
    const select = document.getElementById('category-filter');
    if (select.options.length > 1) return;
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        select.appendChild(option);
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

function updateComparisonPanel() {
    const panel = document.getElementById('comparison-panel');
    const count = selectedProducts.size;
    panel.hidden = count === 0;
    document.getElementById('comparison-count').textContent = count;
    document.getElementById('compare-button').disabled = count < 2;
    document.querySelectorAll('[data-product-id]').forEach(input => {
        input.disabled = count >= MAX_COMPARISON_PRODUCTS && !input.checked;
    });
}

function renderComparison() {
    const products = [...selectedProducts.values()];
    const rows = [
        ['Name', product => product.name],
        ['SKU', product => product.part_number],
        ['Category', product => product.category],
        ['Price', product => `${product.currency} ${product.price.toFixed(2)}`],
        ['Rating', product => `${product.rating} / 5.0`],
        ['Stock', product => `${product.stock_quantity} units`],
        ['Weight', product => product.weight],
        ['Dimensions', product => product.dimensions]
    ];
    const table = document.createElement('table');
    table.className = 'comparison-table';
    table.innerHTML = `<thead><tr><th>Specification</th>${products.map(product => `<th>${product.name}</th>`).join('')}</tr></thead>`;
    const body = document.createElement('tbody');
    rows.forEach(([label, value]) => {
        const row = document.createElement('tr');
        row.innerHTML = `<th>${label}</th>${products.map(product => `<td>${value(product)}</td>`).join('')}`;
        body.appendChild(row);
    });
    table.appendChild(body);
    const container = document.getElementById('comparison-table-container');
    container.replaceChildren(table);
    document.getElementById('comparison-view').hidden = false;
    document.getElementById('comparison-view').scrollIntoView({ behavior: 'smooth' });
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
