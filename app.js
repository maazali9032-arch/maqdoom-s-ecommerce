/**
 * MAQDOOM'S BIG MALL — Main Application Engine
 * Includes:
 * 1. Hero Outfit Cycler with 2-second crossfade & pagination sync
 * 2. Categories Horizontal Carousel with touch/swipe & manual navigation
 * 3. Relational In-Memory/LocalStorage Database with Master Feature Constraint
 * 4. Master Feature Admin Panel (live toggle and database verification)
 * 5. Cart, Wishlist, Quick View & Custom Tailoring Booking Modals
 */

(function () {
  'use strict';

  /* ==========================================================================
     DATABASE & MASTER FEATURE STATE ENGINE
     ========================================================================== */
  
  const INITIAL_CATEGORIES = [
    { id: 'sherwanis', name: 'Sherwanis', route: '#sherwanis' },
    { id: 'kurtas', name: 'Kurtas', route: '#kurtas' },
    { id: 'waistcoats', name: 'Waistcoats', route: '#waistcoats' },
    { id: 'fabrics', name: 'Fabrics', route: '#fabrics' },
    { id: 'accessories', name: 'Accessories', route: '#accessories' }
  ];

  const INITIAL_PRODUCTS = [
    // Sherwanis
    {
      id: 'prod-sh-1',
      categoryId: 'sherwanis',
      title: 'Embroidered Sherwani',
      price: 28999,
      originalPrice: 34999,
      image: './section_2_sherwanis.png',
      colors: ['#D6C5A9', '#8C6C38', '#1E1610'],
      isFeatured: true,
      isMasterFeature: true, // Master Feature for Sherwanis
      description: 'Handcrafted zardozi work on pure raw silk with antique gold accents.'
    },
    {
      id: 'prod-sh-2',
      categoryId: 'sherwanis',
      title: 'Royal Sherwani',
      price: 38499,
      originalPrice: 45000,
      image: './hero_section_person_b_1.2.png',
      colors: ['#5C161D', '#8C6C38', '#14110E'],
      isFeatured: true,
      isMasterFeature: false, // Standard featured item
      description: 'Regal silhouette tailored in fine velvet with bespoke bullion detailing.'
    },
    // Kurtas
    {
      id: 'prod-ku-1',
      categoryId: 'kurtas',
      title: 'Premium Kurta Set',
      price: 8499,
      originalPrice: 10999,
      image: './hero_section_person_d_1.4.png',
      colors: ['#2F3B2C', '#D6C5A9', '#4A3B2C'],
      isFeatured: true,
      isMasterFeature: true, // Master Feature for Kurtas
      description: 'Tailored chanderi silk kurta with signature button placket and churidar.'
    },
    {
      id: 'prod-ku-2',
      categoryId: 'kurtas',
      title: 'Textured Kurta',
      price: 6999,
      originalPrice: 8499,
      image: './section_2_kurtas.png',
      colors: ['#EBE6DD', '#A69B89', '#1E1610'],
      isFeatured: true,
      isMasterFeature: false,
      description: 'Pure handloom cotton-silk with textured geometric weave.'
    },
    // Waistcoats
    {
      id: 'prod-wc-1',
      categoryId: 'waistcoats',
      title: 'Designer Waistcoat',
      price: 12999,
      originalPrice: 15499,
      image: './section_2_waistcoats.png',
      colors: ['#C5A869', '#EBE6DD', '#1E1610'],
      isFeatured: true,
      isMasterFeature: true, // Master Feature for Waistcoats
      description: 'Embossed brocade Nehru waistcoat with brushed brass buttons.'
    },
    {
      id: 'prod-wc-2',
      categoryId: 'waistcoats',
      title: 'Velvet Embroidered Waistcoat',
      price: 14500,
      originalPrice: 17000,
      image: './hero_section_person_c_1.3.png',
      colors: ['#1A1715', '#C5A869', '#3D2F22'],
      isFeatured: true,
      isMasterFeature: false,
      description: 'Micro-velvet base with resham thread floral motifs.'
    },
    // Fabrics
    {
      id: 'prod-fb-1',
      categoryId: 'fabrics',
      title: 'Heritage Brocade Thaan',
      price: 16999,
      originalPrice: 19999,
      image: './section_2_fabrics.png',
      colors: ['#C5A869', '#7D1C24', '#1E4032'],
      isFeatured: true,
      isMasterFeature: true, // Master Feature for Fabrics
      description: '5-meter pure Banarasi brocade unstitched fabric for bespoke sherwanis.'
    },
    {
      id: 'prod-fb-2',
      categoryId: 'fabrics',
      title: 'Raw Silk Jacquard Thaan',
      price: 18500,
      originalPrice: 22000,
      image: './section_4_bg.png',
      colors: ['#3E2723', '#C5A869', '#D7CCC8'],
      isFeatured: true,
      isMasterFeature: false,
      description: 'Heavy GSM mulberry silk weave with metallic zari warp.'
    },
    // Accessories
    {
      id: 'prod-ac-1',
      categoryId: 'accessories',
      title: 'Royal Mojaris & Accessories',
      price: 5499,
      originalPrice: 6999,
      image: './section_2_accessories.png',
      colors: ['#C5A869', '#8C6C38', '#14110E'],
      isFeatured: true,
      isMasterFeature: true, // Master Feature for Accessories
      description: 'Hand-embroidered leather juttis complemented with antique turban brooch.'
    }
  ];

  class MBMDatabase {
    constructor() {
      this.STORAGE_KEY = 'mbm_database_v1';
      this.init();
    }

    init() {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          this.categories = parsed.categories || INITIAL_CATEGORIES;
          this.products = parsed.products || INITIAL_PRODUCTS;
          return;
        } catch (e) {
          console.warn('Failed to parse stored MBM DB, resetting to defaults.', e);
        }
      }
      this.categories = [...INITIAL_CATEGORIES];
      this.products = [...INITIAL_PRODUCTS];
      this.save();
    }

    save() {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
        categories: this.categories,
        products: this.products
      }));
    }

    reset() {
      this.categories = [...INITIAL_CATEGORIES];
      this.products = [...INITIAL_PRODUCTS];
      this.save();
    }

    getCategories() {
      return this.categories;
    }

    getProducts() {
      return this.products;
    }

    getProductById(id) {
      return this.products.find(p => p.id === id);
    }

    /**
     * Master Feature Enforcement Rule:
     * - Only ONE product per category can have isMasterFeature = true.
     * - Setting a product as Master Feature automatically unsets any prior Master Feature in that category.
     */
    setMasterFeature(productId, state) {
      const target = this.getProductById(productId);
      if (!target) return false;

      if (state === true) {
        // Enforce uniqueness: unset all others in this category
        this.products.forEach(p => {
          if (p.categoryId === target.categoryId) {
            p.isMasterFeature = false;
          }
        });
        target.isMasterFeature = true;
      } else {
        // Unsetting master feature leaves category with no active master feature
        target.isMasterFeature = false;
      }

      this.save();
      return true;
    }

    /**
     * Section 6 Homepage Query:
     * "The homepage must display the Master Feature products from the different categories together in this section.
     *  If a category has no Master Feature product, omit that category from the homepage product selection.
     *  Do not automatically substitute an ordinary featured product."
     */
    getActiveMasterFeatures() {
      const results = [];
      for (const cat of this.categories) {
        const mfProduct = this.products.find(p => p.categoryId === cat.id && p.isMasterFeature === true);
        if (mfProduct) {
          results.push({
            ...mfProduct,
            categoryName: cat.name
          });
        }
      }
      return results;
    }
  }

  const db = new MBMDatabase();

  /* ==========================================================================
     CART & WISHLIST STATE
     ========================================================================== */
  const cart = [];
  const wishlist = new Set(['prod-sh-1', 'prod-ku-1']); // default favorites

  function showToast(message) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 350);
    }, 2800);
  }

  function updateCartBadge() {
    const badge = document.getElementById('cartBadgeCount');
    const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (badge) {
      badge.textContent = `(${totalCount})`;
    }
  }

  function updateWishlistBadge() {
    const badge = document.getElementById('wishlistBadgeCount');
    if (badge) {
      badge.textContent = `(${wishlist.size})`;
    }
  }

  function addToCart(product, quantity = 1) {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      existing.quantity += quantity;
    } else {
      cart.push({ ...product, quantity });
    }
    updateCartBadge();
    renderCartDrawer();
    showToast(`Added "${product.title}" to your cart`);
  }

  function removeFromCart(productId) {
    const idx = cart.findIndex(item => item.id === productId);
    if (idx !== -1) {
      const removed = cart.splice(idx, 1)[0];
      updateCartBadge();
      renderCartDrawer();
      showToast(`Removed "${removed.title}" from your cart`);
    }
  }

  function toggleWishlist(product, buttonEl) {
    if (wishlist.has(product.id)) {
      wishlist.delete(product.id);
      if (buttonEl) buttonEl.classList.remove('active');
      showToast(`Removed "${product.title}" from your wishlist`);
    } else {
      wishlist.add(product.id);
      if (buttonEl) buttonEl.classList.add('active');
      showToast(`Saved "${product.title}" to your wishlist`);
    }
    updateWishlistBadge();
    renderWishlistDrawer();
  }

  /* ==========================================================================
     HERO OUTFIT CYCLER CONTROLLER
     - 4 cutouts (person_a -> person_b -> person_c -> person_d)
     - 2 seconds pause per outfit
     - Smooth opacity/subtle transform transitions
     - Syncs with 01 — 02 — 03 — 04 indicators
     - Pauses on hover
     - Respects prefers-reduced-motion
     ========================================================================== */
  function initHeroOutfitCycler() {
    const outfits = document.querySelectorAll('.model-outfit');
    const pageNums = document.querySelectorAll('.hero-pagination .page-num');
    const heroStage = document.getElementById('heroModelStage');
    if (!outfits.length) return;

    let currentIndex = 0;
    let timer = null;
    let isPaused = false;

    // Check user accessibility preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const intervalMs = prefersReducedMotion ? 6000 : 2200;

    function showOutfit(index) {
      currentIndex = index;
      outfits.forEach((outfit, i) => {
        if (i === index) {
          outfit.classList.add('active');
        } else {
          outfit.classList.remove('active');
        }
      });

      pageNums.forEach((btn, i) => {
        if (i === index) {
          btn.classList.add('active');
          btn.setAttribute('aria-current', 'true');
        } else {
          btn.classList.remove('active');
          btn.removeAttribute('aria-current');
        }
      });
    }

    function nextOutfit() {
      if (isPaused) return;
      const nextIndex = (currentIndex + 1) % outfits.length;
      showOutfit(nextIndex);
    }

    function startTimer() {
      if (timer) clearInterval(timer);
      timer = setInterval(nextOutfit, intervalMs);
    }

    function resetTimer() {
      if (timer) clearInterval(timer);
      startTimer();
    }

    // Attach click events on pagination numbers
    pageNums.forEach((btn, i) => {
      btn.addEventListener('click', () => {
        showOutfit(i);
        resetTimer();
      });
    });

    // Pause on hover
    if (heroStage) {
      heroStage.addEventListener('mouseenter', () => { isPaused = true; });
      heroStage.addEventListener('mouseleave', () => { isPaused = false; });
    }

    startTimer();
  }

  /* ==========================================================================
     CATEGORIES HORIZONTAL CAROUSEL CONTROLLER
     ========================================================================== */
  // function initCategoriesCarousel() {
  //   const wrap = document.getElementById('categoriesCarouselWrap');
  //   const prevBtn = document.getElementById('catPrevBtn');
  //   const nextBtn = document.getElementById('catNextBtn');
  //   if (!wrap || !prevBtn || !nextBtn) return;

  //   const scrollAmount = 300;

  //   prevBtn.addEventListener('click', () => {
  //     wrap.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
  //   });

  //   nextBtn.addEventListener('click', () => {
  //     wrap.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  //   });

  //   // Mouse drag support for desktop
  //   let isDown = false;
  //   let startX = 0;
  //   let scrollLeft = 0;

  //   wrap.addEventListener('mousedown', (e) => {
  //     isDown = true;
  //     startX = e.pageX - wrap.offsetLeft;
  //     scrollLeft = wrap.scrollLeft;
  //     wrap.style.cursor = 'grabbing';
  //     wrap.style.scrollSnapType = 'none'; // prevent jitter during drag
  //   });

  //   window.addEventListener('mouseup', () => {
  //     if (isDown) {
  //       isDown = false;
  //       wrap.style.cursor = 'grab';
  //       wrap.style.scrollSnapType = 'x mandatory';
  //     }
  //   });

  //   wrap.addEventListener('mousemove', (e) => {
  //     if (!isDown) return;
  //     e.preventDefault();
  //     const x = e.pageX - wrap.offsetLeft;
  //     const walk = (x - startX) * 1.5;
  //     wrap.scrollLeft = scrollLeft - walk;
  //   });
  // }



function initCategoriesCarousel() {
  const wrap = document.getElementById('categoriesCarouselWrap');
  const prev = document.getElementById('catPrevBtn');
  const next = document.getElementById('catNextBtn');

  if (!wrap) {
    console.error('MBM: Categories carousel container not found.');
    return;
  }

  const track = wrap.querySelector('.categories-track');
  if (!track) {
    console.error('MBM: Categories track not found.');
    return;
  }

  // Force the correct horizontal layout, overriding conflicting CSS.
  wrap.style.setProperty('display', 'block', 'important');
  wrap.style.setProperty('width', '100%', 'important');
  wrap.style.setProperty('overflow-x', 'auto', 'important');
  wrap.style.setProperty('overflow-y', 'hidden', 'important');
  wrap.style.setProperty('scroll-behavior', 'smooth', 'important');
  wrap.style.setProperty('scrollbar-width', 'none', 'important');

  track.style.setProperty('display', 'flex', 'important');
  track.style.setProperty('flex-wrap', 'nowrap', 'important');
  track.style.setProperty('width', 'max-content', 'important');
  track.style.setProperty('min-width', '100%', 'important');
  track.style.setProperty('gap', '22px', 'important');
  track.style.setProperty('transform', 'none', 'important');
  track.style.setProperty('animation', 'none', 'important');

  const cards = [...track.querySelectorAll('.category-card')];

  cards.forEach(card => {
    card.style.setProperty('flex-shrink', '0', 'important');
    card.style.setProperty(
      'width',
      window.innerWidth <= 768 ? '78vw' : '268px',
      'important'
    );
  });

  function scrollCarousel(direction) {
    const card = cards[0];
    if (!card) return;

    const gap = parseFloat(getComputedStyle(track).gap) || 22;
    const distance = card.getBoundingClientRect().width + gap;
    const maxScroll = wrap.scrollWidth - wrap.clientWidth;

    if (maxScroll <= 1) {
      console.warn('MBM: Carousel has no horizontal overflow.', {
        scrollWidth: wrap.scrollWidth,
        clientWidth: wrap.clientWidth
      });
      return;
    }

    let target = wrap.scrollLeft + direction * distance;

    if (target > maxScroll - 2) target = 0;
    if (target < 0) target = maxScroll;

    wrap.scrollTo({ left: target, behavior: 'smooth' });
  }

  prev?.addEventListener('click', () => scrollCarousel(-1));
  next?.addEventListener('click', () => scrollCarousel(1));

  // Automatically advance on mobile.
  let timer;

  function startAutoplay() {
    clearInterval(timer);
    if (window.innerWidth > 768) return;

    timer = setInterval(() => scrollCarousel(1), 3500);
  }

  startAutoplay();
  window.addEventListener('resize', startAutoplay);

  console.info('MBM carousel initialized:', {
    cards: cards.length,
    viewport: wrap.clientWidth,
    content: wrap.scrollWidth
  });
}


  
  /* ==========================================================================
     SECTION 6: FEATURED PRODUCTS RENDERER (MASTER FEATURE LOGIC)
     ========================================================================== */
  function renderFeaturedProducts() {
    const container = document.getElementById('featuredProductsGrid');
    const countNote = document.getElementById('masterFeatureActiveCount');
    if (!container) return;

    // Query DB for Master Features only
    const masterFeatures = db.getActiveMasterFeatures();

    if (countNote) {
      countNote.textContent = `${masterFeatures.length} Active Master Feature categories displayed`;
    }

    if (masterFeatures.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 3rem; text-align: center; background: #fff; border: 1px dashed var(--color-gold);">
          <p style="font-family: var(--font-serif-display); font-size: 1.2rem; color: var(--color-espresso); margin-bottom: 0.5rem;">
            No Active Master Feature Products
          </p>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.25rem;">
            Per the Master Feature logic rule, categories without an active Master Feature are omitted from the homepage.
          </p>
          <button id="openAdminFromEmptyBtn" class="btn-primary" style="padding: 0.6rem 1.4rem; font-size: 0.8rem;">
            Open Database Admin to Set Master Features
          </button>
        </div>
      `;
      const emptyAdminBtn = document.getElementById('openAdminFromEmptyBtn');
      if (emptyAdminBtn) {
        emptyAdminBtn.addEventListener('click', openAdminDrawer);
      }
      return;
    }

    container.innerHTML = masterFeatures.map(prod => {
      const isWishlisted = wishlist.has(prod.id);
      return `
        <article class="product-card" data-product-id="${prod.id}">
          <div class="product-media-box">
            <img class="product-img" src="${prod.image}" alt="${prod.title}" loading="lazy">
            <span class="product-category-tag">${prod.categoryName}</span>
            <button class="btn-wishlist ${isWishlisted ? 'active' : ''}" 
                    aria-label="Save to wishlist" 
                    data-action="wishlist" 
                    data-id="${prod.id}">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="${isWishlisted ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.8">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
            </button>
          </div>
          <div class="product-details">
            <h3 class="product-title">${prod.title}</h3>
            <div class="product-price-row">
              <span class="product-price">₹${prod.price.toLocaleString('en-IN')}</span>
              ${prod.originalPrice ? `<span class="product-original-price">₹${prod.originalPrice.toLocaleString('en-IN')}</span>` : ''}
            </div>
            <div class="product-card-footer">
              <div class="swatch-group" title="Available Colors">
                ${prod.colors.map(color => `<span class="color-dot" style="background-color: ${color};"></span>`).join('')}
              </div>
              <button class="btn-add-cart" aria-label="Add to cart" data-action="cart" data-id="${prod.id}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <path d="M16 10a4 4 0 0 1-8 0"></path>
                </svg>
              </button>
            </div>
          </div>
        </article>
      `;
    }).join('');

    // Attach card event listeners
    container.querySelectorAll('[data-action="wishlist"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const prod = db.getProductById(id);
        if (prod) toggleWishlist(prod, btn);
      });
    });

    container.querySelectorAll('[data-action="cart"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const prod = db.getProductById(id);
        if (prod) addToCart(prod);
      });
    });

    container.querySelectorAll('.product-card').forEach(card => {
      card.addEventListener('click', (e) => {
        // Prevent trigger if clicking on actions
        if (e.target.closest('button')) return;
        const id = card.getAttribute('data-product-id');
        const prod = db.getProductById(id);
        if (prod) openQuickViewModal(prod);
      });
    });
  }

  /* ==========================================================================
     ADMIN / MASTER FEATURE MANAGEMENT DRAWER
     Enforces & visually proves the database constraint:
     - Only ONE active Master Feature per category
     - Unsetting Master Feature omits that category from homepage
     - Setting another product replaces previous Master Feature
     ========================================================================== */
  function renderAdminDrawer() {
    const list = document.getElementById('adminCategoryList');
    if (!list) return;

    const categories = db.getCategories();
    const allProducts = db.getProducts();

    list.innerHTML = categories.map(cat => {
      const catProducts = allProducts.filter(p => p.categoryId === cat.id);
      const activeMaster = catProducts.find(p => p.isMasterFeature === true);

      return `
        <div class="category-admin-group">
          <div class="category-admin-header">
            <span>${cat.name}</span>
            <span style="font-size: 0.75rem; font-weight: 500; color: ${activeMaster ? 'var(--color-gold-deep)' : '#c92a2a'};">
              ${activeMaster ? '● 1 Active MF' : '○ 0 Active MF (Omitted)'}
            </span>
          </div>
          <div>
            ${catProducts.map(p => `
              <div class="admin-product-row">
                <div>
                  <div style="font-weight: 600; color: var(--color-espresso);">${p.title}</div>
                  <div style="font-size: 0.72rem; color: var(--text-muted);">
                    ₹${p.price.toLocaleString('en-IN')} &bull; ${p.isFeatured ? 'Featured (Category)' : 'Standard'}
                  </div>
                </div>
                <button class="admin-toggle-btn ${p.isMasterFeature ? 'is-active-mf' : ''}" 
                        data-admin-id="${p.id}" 
                        data-cat-id="${cat.id}">
                  ${p.isMasterFeature ? 'Master Feature ✓' : 'Set as MF'}
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');

    // Attach toggle buttons
    list.querySelectorAll('.admin-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const prodId = btn.getAttribute('data-admin-id');
        const prod = db.getProductById(prodId);
        if (!prod) return;

        // Toggle state
        const newState = !prod.isMasterFeature;
        db.setMasterFeature(prodId, newState);

        // Re-render UI & Admin
        renderAdminDrawer();
        renderFeaturedProducts();
        showToast(newState 
          ? `"${prod.title}" is now the sole Master Feature for ${prod.categoryId}` 
          : `Removed Master Feature from "${prod.title}". Category is now omitted from homepage.`
        );
      });
    });
  }

  function openAdminDrawer() {
    renderAdminDrawer();
    const drawer = document.getElementById('adminDrawer');
    if (drawer) drawer.classList.add('open');
  }

  function closeAdminDrawer() {
    const drawer = document.getElementById('adminDrawer');
    if (drawer) drawer.classList.remove('open');
  }

  /* ==========================================================================
     CART & WISHLIST DRAWERS
     ========================================================================== */
  function renderCartDrawer() {
    const body = document.getElementById('cartDrawerBody');
    const footer = document.getElementById('cartDrawerFooter');
    if (!body || !footer) return;

    if (cart.length === 0) {
      body.innerHTML = `
        <div style="text-align: center; padding: 3rem 1rem;">
          <p style="font-family: var(--font-serif-display); font-size: 1.1rem; color: var(--color-espresso); margin-bottom: 0.5rem;">Your Shopping Bag is Empty</p>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.5rem;">Discover our heritage kurtas, sherwanis, and fine thaans.</p>
          <button class="btn-primary close-cart-cta" style="padding: 0.7rem 1.4rem; font-size: 0.8rem;">Explore Collection</button>
        </div>
      `;
      footer.style.display = 'none';
      const cta = body.querySelector('.close-cart-cta');
      if (cta) cta.addEventListener('click', closeCartDrawer);
      return;
    }

    footer.style.display = 'block';
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    body.innerHTML = cart.map(item => `
      <div style="display: flex; gap: 1rem; padding: 1rem 0; border-bottom: 1px solid var(--color-taupe-light);">
        <img src="${item.image}" alt="${item.title}" style="width: 70px; height: 90px; object-fit: cover; border-radius: var(--radius-xs);">
        <div style="flex-grow: 1;">
          <h4 style="font-family: var(--font-serif-display); font-size: 0.9rem; font-weight: 600; color: var(--color-espresso); margin-bottom: 0.25rem;">${item.title}</h4>
          <p style="font-size: 0.85rem; font-weight: 700; color: var(--color-espresso); margin-bottom: 0.5rem;">₹${item.price.toLocaleString('en-IN')}</p>
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.82rem;">
              <span>Qty: <strong>${item.quantity}</strong></span>
            </div>
            <button class="cart-remove-btn" data-id="${item.id}" style="background: none; border: none; font-size: 0.75rem; color: #c92a2a; cursor: pointer; text-decoration: underline;">Remove</button>
          </div>
        </div>
      </div>
    `).join('');

    footer.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <span style="font-family: var(--font-serif-display); font-size: 0.95rem; font-weight: 600; text-transform: uppercase;">Subtotal:</span>
        <span style="font-size: 1.15rem; font-weight: 700; color: var(--color-espresso);">₹${subtotal.toLocaleString('en-IN')}</span>
      </div>
      <p style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 1rem; text-align: center;">Taxes and insured shipping calculated at checkout.</p>
      <button id="checkoutBtn" class="btn-primary" style="width: 100%; justify-content: center;">Proceed to Checkout &rarr;</button>
    `;

    body.querySelectorAll('.cart-remove-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        removeFromCart(btn.getAttribute('data-id'));
      });
    });

    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', () => {
        showToast('Demo order registered! Thank you for choosing MAQDOOM’S BIG MALL.');
        cart.length = 0;
        updateCartBadge();
        renderCartDrawer();
        closeCartDrawer();
      });
    }
  }

  function openCartDrawer() {
    renderCartDrawer();
    const drawer = document.getElementById('cartDrawer');
    if (drawer) drawer.classList.add('open');
  }

  function closeCartDrawer() {
    const drawer = document.getElementById('cartDrawer');
    if (drawer) drawer.classList.remove('open');
  }

  function renderWishlistDrawer() {
    const body = document.getElementById('wishlistDrawerBody');
    if (!body) return;

    const items = Array.from(wishlist).map(id => db.getProductById(id)).filter(Boolean);

    if (items.length === 0) {
      body.innerHTML = `
        <div style="text-align: center; padding: 3rem 1rem;">
          <p style="font-family: var(--font-serif-display); font-size: 1.1rem; color: var(--color-espresso); margin-bottom: 0.5rem;">Your Wishlist is Empty</p>
          <p style="font-size: 0.85rem; color: var(--text-muted);">Click the heart icon on any product to save your favorites.</p>
        </div>
      `;
      return;
    }

    body.innerHTML = items.map(item => `
      <div style="display: flex; gap: 1rem; padding: 1rem 0; border-bottom: 1px solid var(--color-taupe-light);">
        <img src="${item.image}" alt="${item.title}" style="width: 70px; height: 90px; object-fit: cover; border-radius: var(--radius-xs);">
        <div style="flex-grow: 1;">
          <h4 style="font-family: var(--font-serif-display); font-size: 0.9rem; font-weight: 600; color: var(--color-espresso); margin-bottom: 0.25rem;">${item.title}</h4>
          <p style="font-size: 0.85rem; font-weight: 700; color: var(--color-espresso); margin-bottom: 0.75rem;">₹${item.price.toLocaleString('en-IN')}</p>
          <div style="display: flex; gap: 0.75rem;">
            <button class="wishlist-move-cart btn-primary" data-id="${item.id}" style="padding: 0.4rem 0.8rem; font-size: 0.75rem;">Move to Cart</button>
            <button class="wishlist-remove-btn" data-id="${item.id}" style="background: none; border: none; font-size: 0.75rem; color: #c92a2a; cursor: pointer; text-decoration: underline;">Remove</button>
          </div>
        </div>
      </div>
    `).join('');

    body.querySelectorAll('.wishlist-move-cart').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const prod = db.getProductById(id);
        if (prod) {
          addToCart(prod);
          wishlist.delete(id);
          updateWishlistBadge();
          renderWishlistDrawer();
          renderFeaturedProducts();
        }
      });
    });

    body.querySelectorAll('.wishlist-remove-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const prod = db.getProductById(id);
        if (prod) {
          toggleWishlist(prod);
          renderWishlistDrawer();
          renderFeaturedProducts();
        }
      });
    });
  }

  function openWishlistDrawer() {
    renderWishlistDrawer();
    const drawer = document.getElementById('wishlistDrawer');
    if (drawer) drawer.classList.add('open');
  }

  function closeWishlistDrawer() {
    const drawer = document.getElementById('wishlistDrawer');
    if (drawer) drawer.classList.remove('open');
  }

  /* ==========================================================================
     MODALS: QUICK VIEW, APPOINTMENT, FILM
     ========================================================================== */
  function openQuickViewModal(product) {
    const modal = document.getElementById('quickViewModal');
    const container = document.getElementById('quickViewContent');
    if (!modal || !container) return;

    container.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1.1fr; gap: 1.75rem;">
        <div>
          <img src="${product.image}" alt="${product.title}" style="width: 100%; border-radius: var(--radius-xs); object-fit: cover; max-height: 400px;">
        </div>
        <div>
          <span style="font-size: 0.72rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--color-gold-deep); font-weight: 600;">
            MAQDOOM'S &bull; ${product.categoryId.toUpperCase()}
          </span>
          <h2 style="font-family: var(--font-serif-display); font-size: 1.5rem; color: var(--color-espresso); margin: 0.4rem 0 0.8rem;">
            ${product.title}
          </h2>
          <div style="display: flex; align-items: baseline; gap: 0.75rem; margin-bottom: 1rem;">
            <span style="font-size: 1.3rem; font-weight: 700; color: var(--color-espresso);">₹${product.price.toLocaleString('en-IN')}</span>
            ${product.originalPrice ? `<span style="font-size: 0.9rem; color: var(--text-muted); text-decoration: line-through;">₹${product.originalPrice.toLocaleString('en-IN')}</span>` : ''}
          </div>
          <p style="font-size: 0.85rem; line-height: 1.6; color: var(--text-secondary); margin-bottom: 1.25rem;">
            ${product.description}
          </p>
          <div style="margin-bottom: 1.25rem;">
            <label style="display: block; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; margin-bottom: 0.4rem;">Select Size</label>
            <div style="display: flex; gap: 0.5rem;">
              ${['38 (S)', '40 (M)', '42 (L)', '44 (XL)'].map((s, idx) => `
                <button type="button" class="size-btn ${idx === 1 ? 'selected' : ''}" style="padding: 0.4rem 0.8rem; border: 1px solid var(--color-espresso-border); background: ${idx === 1 ? 'var(--color-espresso)' : '#fff'}; color: ${idx === 1 ? '#fff' : 'inherit'}; border-radius: var(--radius-xs); font-size: 0.78rem; cursor: pointer;">
                  ${s}
                </button>
              `).join('')}
            </div>
          </div>
          <div style="display: flex; gap: 0.75rem;">
            <button id="modalAddToCartBtn" class="btn-primary" style="flex-grow: 1; justify-content: center;">Add to Shopping Bag</button>
          </div>
        </div>
      </div>
    `;

    const addBtn = container.querySelector('#modalAddToCartBtn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        addToCart(product);
        closeModal(modal);
      });
    }

    modal.classList.add('open');
  }

  function openAppointmentModal() {
    const modal = document.getElementById('appointmentModal');
    if (modal) modal.classList.add('open');
  }

  function openFilmModal() {
    const modal = document.getElementById('filmModal');
    if (modal) modal.classList.add('open');
  }

  function closeModal(modalEl) {
    if (modalEl) modalEl.classList.remove('open');
  }

  /* ==========================================================================
     GLOBAL INITIALIZATION & EVENT DELEGATION
     ========================================================================== */
  document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Hero Outfit cycler
    initHeroOutfitCycler();

    // 2. Initialize Categories Carousel
    initCategoriesCarousel();

    // 3. Render Master Feature Featured Products
    renderFeaturedProducts();

    // 4. Update Header Badges
    updateCartBadge();
    updateWishlistBadge();

    // 5. Header Scroll Effect
    const header = document.querySelector('.site-header');
    window.addEventListener('scroll', () => {
      if (window.scrollY > 40) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    }, { passive: true });

    // 6. Navigation Drawers & Buttons
    document.getElementById('openCartBtn')?.addEventListener('click', openCartDrawer);
    document.getElementById('closeCartBtn')?.addEventListener('click', closeCartDrawer);

    document.getElementById('openWishlistBtn')?.addEventListener('click', openWishlistDrawer);
    document.getElementById('closeWishlistBtn')?.addEventListener('click', closeWishlistDrawer);

    document.getElementById('openAdminBtn')?.addEventListener('click', openAdminDrawer);
    document.getElementById('openAdminFromNoteLink')?.addEventListener('click', (e) => {
      e.preventDefault();
      openAdminDrawer();
    });
    document.getElementById('closeAdminBtn')?.addEventListener('click', closeAdminDrawer);

    // Reset DB to defaults
    document.getElementById('resetDbBtn')?.addEventListener('click', () => {
      db.reset();
      renderAdminDrawer();
      renderFeaturedProducts();
      showToast('Database reset to factory Master Feature defaults.');
    });

    // Custom Tailoring Appointment Modal Triggers
    document.querySelectorAll('[data-action="book-appointment"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        openAppointmentModal();
      });
    });

    // Watch Film Modal Triggers
    document.querySelectorAll('[data-action="watch-film"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        openFilmModal();
      });
    });

    // Close Modals on backdrop click or close button
    document.querySelectorAll('.modal-backdrop').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.closest('.modal-close-btn')) {
          closeModal(modal);
        }
      });
    });

    // Close Drawers on backdrop click
    document.querySelectorAll('.drawer-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          backdrop.classList.remove('open');
        }
      });
    });

    // Custom Tailoring Form Submit
    const appointmentForm = document.getElementById('appointmentForm');
    if (appointmentForm) {
      appointmentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('aptName')?.value || 'Guest';
        const service = document.getElementById('aptService')?.value || 'Custom Tailoring';
        const date = document.getElementById('aptDate')?.value || 'Upcoming date';
        showToast(`Appointment booked for ${name} (${service}) on ${date}. Our master stylist will contact you.`);
        appointmentForm.reset();
        closeModal(document.getElementById('appointmentModal'));
      });
    }

    // Newsletter Form Submit
    const newsletterForm = document.getElementById('newsletterForm');
    if (newsletterForm) {
      newsletterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = newsletterForm.querySelector('input[type="email"]');
        if (input && input.value) {
          showToast(`Thank you! ${input.value} has been subscribed to MAQDOOM’S exclusive updates.`);
          input.value = '';
        }
      });
    }

    // Mobile Menu Toggle
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileDrawer = document.getElementById('mobileDrawer');
    const closeMobileDrawerBtn = document.getElementById('closeMobileDrawerBtn');

    mobileMenuBtn?.addEventListener('click', () => {
      mobileDrawer?.classList.add('open');
    });

    closeMobileDrawerBtn?.addEventListener('click', () => {
      mobileDrawer?.classList.remove('open');
    });

    mobileDrawer?.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileDrawer.classList.remove('open');
      });
    });
  });

})();
