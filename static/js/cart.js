class CartManager {
  constructor() {
    this.cart = JSON.parse(localStorage.getItem("cart")) || [];
    this.init();
  }

  init() {
    this.updateCartCount();
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.setupCartPageEvents();
  }

  setupCartPageEvents() {
    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("quantity-increase")) {
        const productId = parseInt(e.target.getAttribute("data-id"));
        this.increaseQuantity(productId);
      }

      if (e.target.classList.contains("quantity-decrease")) {
        const productId = parseInt(e.target.getAttribute("data-id"));
        this.decreaseQuantity(productId);
      }

      if (e.target.classList.contains("remove-item")) {
        const productId = parseInt(e.target.getAttribute("data-id"));
        this.removeFromCart(productId);
      }
    });
  }

  addToCart(product) {
    const existingItem = this.cart.find((item) => item.id === product.id);

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      this.cart.push({
        ...product,
        quantity: 1,
      });
    }

    this.saveCart();
    this.updateCartCount();
  }

  removeFromCart(productId) {
    this.cart = this.cart.filter((item) => item.id !== productId);
    this.saveCart();
    this.updateCartCount();
    this.updateCartPage();
    showNotification("Item removed from cart", "success");
  }

  increaseQuantity(productId) {
    const item = this.cart.find((item) => item.id === productId);
    if (item) {
      item.quantity += 1;
      this.saveCart();
      this.updateCartCount();
      this.updateCartPage();
    }
  }

  decreaseQuantity(productId) {
    const item = this.cart.find((item) => item.id === productId);
    if (item) {
      if (item.quantity > 1) {
        item.quantity -= 1;
      } else {
        this.removeFromCart(productId);
        return;
      }
      this.saveCart();
      this.updateCartCount();
      this.updateCartPage();
    }
  }

  updateCartCount() {
    const cartCountElements = document.querySelectorAll(".cart-count");
    const totalItems = this.cart.reduce((sum, item) => sum + item.quantity, 0);

    cartCountElements.forEach((element) => {
      element.textContent = totalItems;
    });
  }

  updateCartPage() {
    const cartItemsContainer = document.getElementById("cart-items");
    const cartSummary = document.getElementById("cart-summary");

    if (cartItemsContainer) {
      cartItemsContainer.innerHTML = this.generateCartItemsHTML();
    }

    if (cartSummary) {
      cartSummary.innerHTML = this.generateCartSummaryHTML();
    }
  }

  generateCartItemsHTML() {
    if (this.cart.length === 0) {
      return `
                <div class="empty-cart">
                    <h3>Your cart is empty</h3>
                    <p>Add some products to your cart!</p>
                    <a href="product.html" class="btn btn-primary">Browse Products</a>
                </div>
            `;
    }

    return this.cart
      .map(
        (item) => `
            <div class="cart-item">
                <div class="product-image">${item.image}</div>
                <div class="item-details">
                    <h4 class="product-name">${item.name}</h4>
                    <p class="product-price">${item.displayPrice}</p>
                </div>
                <div class="quantity-controls">
                    <button class="quantity-btn quantity-decrease" data-id="${
                      item.id
                    }">-</button>
                    <span class="quantity">${item.quantity}</span>
                    <button class="quantity-btn quantity-increase" data-id="${
                      item.id
                    }">+</button>
                </div>
                <div class="item-total">
                    ${this.calculateItemTotal(item)}
                </div>
                <button class="btn btn-outline remove-item" data-id="${
                  item.id
                }">Remove</button>
            </div>
        `
      )
      .join("");
  }

  generateCartSummaryHTML() {
    const subtotal = this.calculateSubtotal();
    const delivery = 10000;
    const discount = 0;
    const total = subtotal + delivery - discount;

    return `
            <div class="summary-row">
                <span>Subtotal:</span>
                <span>Rp ${subtotal.toLocaleString("id-ID")}</span>
            </div>
            <div class="summary-row">
                <span>Delivery:</span>
                <span>Rp ${delivery.toLocaleString("id-ID")}</span>
            </div>
            <div class="summary-row">
                <span>Discount:</span>
                <span>Rp ${discount.toLocaleString("id-ID")}</span>
            </div>
            <div class="summary-row total">
                <span>Total:</span>
                <span>Rp ${total.toLocaleString("id-ID")}</span>
            </div>
            <a href="checkout.html" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">
                Checkout
            </a>
        `;
  }

  calculateItemTotal(item) {
    const total = item.price * item.quantity;
    return `Rp ${total.toLocaleString("id-ID")}`;
  }

  calculateSubtotal() {
    return this.cart.reduce((total, item) => {
      return total + item.price * item.quantity;
    }, 0);
  }

  getCartItems() {
    return this.cart;
  }

  clearCart() {
    this.cart = [];
    this.saveCart();
    this.updateCartCount();
    this.updateCartPage();
  }

  saveCart() {
    localStorage.setItem("cart", JSON.stringify(this.cart));
  }
}
