// Cart functionality
let cart = JSON.parse(localStorage.getItem('cart')) || [];
const PIX_KEY = '+5511958670509';

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

function parsePrice(value) {
    if (typeof value === 'number') return value;

    let cleaned = String(value).trim().replace(/[^\d,.-]/g, '');
    if (!cleaned) return 0;

    if (cleaned.includes(',') && cleaned.includes('.')) {
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (cleaned.includes(',')) {
        cleaned = cleaned.replace(',', '.');
    }

    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
}

function addToCart(id, name, price, img) {
    const normalizedId = String(id);
    const normalizedPrice = parsePrice(price);
    const existing = cart.find(item => String(item.id) === normalizedId);
    if (existing) {
        existing.qty++;
    } else {
        cart.push({ id: normalizedId, name, price: normalizedPrice, img, qty: 1 });
    }
    saveCart();
    updateCartCount();
    alert('Produto adicionado ao carrinho!');
}

function removeFromCart(id) {
    const normalizedId = String(id);
    const itemIndex = cart.findIndex(item => String(item.id) === normalizedId);

    if (itemIndex === -1) return;

    if (cart[itemIndex].qty > 1) {
        cart[itemIndex].qty -= 1;
    } else {
        cart.splice(itemIndex, 1);
    }

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
                    <button type="button" class="remove-item" data-id="${item.id}">Remover</button>
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
    return pad(id, 2) + pad(new TextEncoder().encode(value).length, 2) + value;
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

function buildPixPayload(total) {
    const amount = total > 0 ? Number(total).toFixed(2) : '0.00';
    const merchantName = 'IMPORTS PEIXES';
    const merchantCity = 'Sao Paulo'.slice(0, 15);

    const keyData =
        buildField('00', 'BR.GOV.BCB.PIX') +
        buildField('01', PIX_KEY);

    const payload =
        buildField('00', '01') +
        buildField('01', '11') +
        buildField('26', keyData) +
        buildField('52', '0000') +
        buildField('53', '986') +
        buildField('54', amount) +
        buildField('58', 'BR') +
        buildField('59', merchantName) +
        buildField('60', merchantCity) +
        buildField('62', buildField('05', '***'));

    const crcPayload = payload + '6304';
    return crcPayload + crc16(crcPayload);
}

function generatePixQRCode(text) {
    const pixCode = document.getElementById('pix-code');
    const pixError = document.getElementById('pix-error');
    if (!pixCode) return false;
    pixCode.innerHTML = '';
    if (!window.QRCode) {
        if (pixError) {
            pixError.textContent = 'Não foi possível carregar o gerador do QR Code. Use o Pix Copia e Cola abaixo.';
        }
        return false;
    }

    new QRCode(pixCode, {
        text,
        width: 250,
        height: 250,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
    });
    if (pixError) pixError.textContent = '';
    return true;
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
            const price = parsePrice(priceText);
            addToCart(id, name, price, img);
        });
    });
    

    document.addEventListener('click', (event) => {
        const removeButton = event.target.closest('.remove-item');
        if (removeButton) {
            removeFromCart(removeButton.dataset.id);
        }
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
                const payload = buildPixPayload(total);
                const formattedTotal = Number(total).toFixed(2);

                document.getElementById('pix-copy-code').value = payload;
                checkoutForm.style.display = 'none';
                document.getElementById('success-message').textContent = `Compra finalizada! Valor do pedido: R$ ${formattedTotal}`;
                document.getElementById('pix-total').textContent = `R$ ${formattedTotal}`;
                document.getElementById('pix-section').classList.remove('hidden');
                if (generatePixQRCode(payload)) {
                    cart = [];
                    saveCart();
                    updateCartCount();
                } else {
                    checkoutForm.style.display = '';
                }
            });
        }
    }

    const copyPixButton = document.getElementById('copy-pix-code');
    if (copyPixButton) {
        copyPixButton.addEventListener('click', async () => {
            const pixCopyCode = document.getElementById('pix-copy-code');
            const copyStatus = document.getElementById('pix-copy-status');
            try {
                await navigator.clipboard.writeText(pixCopyCode.value);
                copyStatus.textContent = 'Código Pix copiado.';
            } catch (error) {
                pixCopyCode.focus();
                pixCopyCode.select();
                copyStatus.textContent = 'Não foi possível copiar automaticamente. Selecione e copie o código acima.';
            }
        });
    }

    // Contact form
    const form = document.querySelector('form');
    if (form) {
        form.addEventListener('submit', function(e) {
            if (window.location.pathname.includes('finalizar-compra.html')) return;
            e.preventDefault();
            alert('Obrigado pela sua avaliação!');
            window.location.href = 'index.html';
        });
    }
});