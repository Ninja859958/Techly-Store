// Cart functionality
let cart = JSON.parse(localStorage.getItem('cart')) || [];

function updateCartCount() {
    const count = cart.reduce((sum, item) => sum + item.qty, 0);
    const cartBtn = document.getElementById('cart-btn');
    if (cartBtn) {
        cartBtn.textContent = `Carrinho (${count})`;
    }
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

function addToCart(id, name, price, img) {
    const existing = cart.find(item => item.id === id);
    if (existing) {
        existing.qty++;
    } else {
        cart.push({ id, name, price: parseFloat(price), img, qty: 1 });
    }
    saveCart();
    updateCartCount();
    alert('Produto adicionado ao carrinho!');
}

function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    saveCart();
    updateCartCount();
    renderCart();
}

function renderCart() {
    const cartItems = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    if (!cartItems || !cartTotal) return;
    cartItems.innerHTML = '';
    let total = 0;
    cart.forEach(item => {
        total += item.price * item.qty;
        cartItems.innerHTML += `
            <div class="cart-item">
                <img src="${item.img}" alt="${item.name}" width="50">
                <div>
                    <h4>${item.name}</h4>
                    <p>R$ ${item.price.toFixed(2)} x ${item.qty}</p>
                    <button onclick="removeFromCart(${item.id})">Remover</button>
                </div>
            </div>
        `;
    });
    cartTotal.textContent = `Total: R$ ${total.toFixed(2)}`;
}

function renderCheckout() {
    const checkoutItems = document.getElementById('checkout-items');
    const checkoutTotal = document.getElementById('checkout-total');
    if (!checkoutItems || !checkoutTotal) return;
    checkoutItems.innerHTML = '';
    let total = 0;
    cart.forEach(item => {
        total += item.price * item.qty;
        checkoutItems.innerHTML += `
            <div class="checkout-item">
                <img src="${item.img}" alt="${item.name}">
                <div>
                    <h4>${item.name}</h4>
                    <p>R$ ${item.price.toFixed(2)} x ${item.qty}</p>
                </div>
            </div>
        `;
    });
    checkoutTotal.textContent = `Total: R$ ${total.toFixed(2)}`;
}

function pad(value, length) {
    return String(value).padStart(length, '0');
}

function buildField(id, value) {
    return pad(id, 2) + pad(value.length, 2) + value;
}

function crc16(payload) {
    let crc = 0xFFFF;
    const polynomial = 0x1021;
    const bytes = new TextEncoder().encode(payload);
    for (const byte of bytes) {
        crc ^= (byte << 8);
        for (let i = 0; i < 8; i++) {
            crc = (crc & 0x8000) ? ((crc << 1) ^ polynomial) : (crc << 1);
            crc &= 0xFFFF;
        }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
}

function buildPixPayload(total, name) {
    const pixKey = '11974621278';
    const amount = total > 0 ? total.toFixed(2) : '0.00';
    const merchantName = 'Techly Store'.slice(0, 25);
    const merchantCity = 'Sao Paulo'.slice(0, 15);

    const gui = buildField('00', 'BR.GOV.BCB.PIX');
    const keyField = buildField('01', pixKey);
    const merchantAccountInfo = buildField('26', gui + keyField);
    const merchantCategory = buildField('52', '0000');
    const currency = buildField('53', '986');
    const value = buildField('54', amount);
    const country = buildField('58', 'BR');
    const merchant = buildField('59', merchantName);
    const city = buildField('60', merchantCity);
    const txid = buildField('05', '***');
    const additional = buildField('62', txid);

    const payloadWithoutCrc =
        buildField('00', '01') +
        buildField('01', '12') +
        merchantAccountInfo +
        merchantCategory +
        currency +
        value +
        country +
        merchant +
        city +
        additional +
        '6304';

    return payloadWithoutCrc + crc16(payloadWithoutCrc);
}

function generatePixQRCode(text) {
    const pixCode = document.getElementById('pix-code');
    if (!pixCode) return;
    pixCode.innerHTML = '';
    if (window.QRCode) {
        new QRCode(pixCode, {
            text,
            width: 250,
            height: 250,
            colorDark: '#000000',
            colorLight: '#ffffff'
        });
    } else {
        pixCode.textContent = text;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    updateCartCount();

    // Add to cart buttons
    document.querySelectorAll('.add-to-cart, .products .card .btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const card = btn.closest('.card');
            const name = btn.dataset.name || card?.querySelector('h3')?.innerText || 'Produto';
            const priceText = btn.dataset.price || card?.querySelector('.price')?.innerText || '0';
            const img = btn.dataset.img || card?.querySelector('img')?.getAttribute('src') || '';
            const id = btn.dataset.id || `${name}-${priceText}`;
            const price = priceText.replace(/[R$\s.]/g, '').replace(',', '.');
            addToCart(id, name, price, img);
        });
    });

    // Cart modal
    const modal = document.getElementById('cart-modal');
    const cartBtn = document.getElementById('cart-btn');
    const close = document.querySelector('.close');
    const checkoutBtn = document.getElementById('checkout-btn');

    if (cartBtn && modal && close) {
        cartBtn.onclick = () => {
            renderCart();
            modal.style.display = 'block';
        };

        close.onclick = () => {
            modal.style.display = 'none';
        };

        window.onclick = (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        };
    }

    if (checkoutBtn) {
        checkoutBtn.onclick = () => {
            if (cart.length === 0) {
                alert('Carrinho vazio!');
                return;
            }
            window.location.href = 'finalizar-compra.html';
        };
    }

    // Checkout page
    if (window.location.pathname.includes('finalizar-compra.html')) {
        renderCheckout();
        const paymentSelect = document.querySelector('select[name="payment"]');
        if (paymentSelect) {
            paymentSelect.addEventListener('change', function() {
                const cardFields = document.querySelectorAll('#card-field, #expiry-field, #cvv-field');
                if (this.value === 'cartao') {
                    cardFields.forEach(field => field.style.display = 'block');
                } else {
                    cardFields.forEach(field => field.style.display = 'none');
                }
            });
        }

        const checkoutForm = document.getElementById('checkout-form');
        if (checkoutForm) {
            checkoutForm.addEventListener('submit', function(e) {
                e.preventDefault();
                if (cart.length === 0) {
                    alert('Carrinho vazio!');
                    return;
                }
                const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
                const name = document.querySelector('input[name="name"]').value || 'Cliente';
                const payload = buildPixPayload(total, name);
                checkoutForm.style.display = 'none';
                document.getElementById('pix-total').textContent = `R$ ${total.toFixed(2)}`;
                document.getElementById('pix-section').classList.remove('hidden');
                generatePixQRCode(payload);
                cart = [];
                saveCart();
                updateCartCount();
            });
        }
    }

    // Contact form
    const form = document.querySelector('form');
    if (form) {
        form.addEventListener('submit', function(e) {
            if (window.location.pathname.includes('finalizar-compra.html')) return;
            e.preventDefault();
            alert('Obrigado pela sua avaliação e sugestões!');
            window.location.href = 'index.html';
        });
    }
});