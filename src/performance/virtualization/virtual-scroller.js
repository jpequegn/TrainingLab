/**
 * Virtual Scroller Component
 * High-performance virtualized list rendering for large datasets
 */

export class VirtualScroller {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      itemHeight: 50,
      bufferSize: 5,
      threshold: 100,
      renderItem: null,
      getItemHeight: null,
      onScroll: null,
      onVisibilityChange: null,
      estimatedItemHeight: 50,
      overscan: 3,
      ...options
    };

    this.data = [];
    this.virtualItems = [];
    this.renderedItems = new Map();
    this.itemHeights = new Map();
    this.scrollTop = 0;
    this.containerHeight = 0;
    this.totalHeight = 0;
    this.startIndex = 0;
    this.endIndex = 0;
    this.isScrolling = false;
    this.scrollTimeout = null;

    // Performance tracking
    this.metrics = {
      renderCount: 0,
      lastRenderTime: 0,
      averageRenderTime: 0,
      totalRenderTime: 0,
      itemsRendered: 0,
      scrollEvents: 0
    };

    this.initializeContainer();
    this.bindEvents();
  }

  /**
   * Initialize container structure
   */
  initializeContainer() {
    // Create virtual container structure
    this.container.style.position = 'relative';
    this.container.style.overflow = 'auto';
    this.container.style.willChange = 'scroll-position';

    // Create spacer element for total height
    this.spacerElement = document.createElement('div');
    this.spacerElement.style.position = 'absolute';
    this.spacerElement.style.top = '0';
    this.spacerElement.style.left = '0';
    this.spacerElement.style.right = '0';
    this.spacerElement.style.pointerEvents = 'none';
    this.container.appendChild(this.spacerElement);

    // Create viewport for visible items
    this.viewport = document.createElement('div');
    this.viewport.style.position = 'relative';
    this.viewport.style.willChange = 'transform';
    this.container.appendChild(this.viewport);

    // Get initial container height
    this.updateContainerHeight();
  }

  /**
   * Bind scroll and resize events
   */
  bindEvents() {
    // Optimized scroll handler with RAF throttling
    this.container.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });
    
    // Resize observer for container size changes
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(this.handleResize.bind(this));
      this.resizeObserver.observe(this.container);
    } else {
      window.addEventListener('resize', this.handleResize.bind(this));
    }

    // Intersection observer for visibility tracking
    if (typeof IntersectionObserver !== 'undefined') {
      this.intersectionObserver = new IntersectionObserver(
        this.handleIntersection.bind(this),
        { root: this.container, threshold: [0, 0.1, 0.5, 1.0] }
      );
    }
  }

  /**
   * Set data and trigger initial render
   */
  setData(data) {
    this.data = data || [];
    this.itemHeights.clear();
    this.renderedItems.clear();
    
    // Calculate initial total height
    this.calculateTotalHeight();
    
    // Reset scroll position
    this.scrollTop = 0;
    this.container.scrollTop = 0;
    
    // Initial render
    this.render();
  }

  /**
   * Update single item and re-render if visible
   */
  updateItem(index, newData) {
    if (index < 0 || index >= this.data.length) return;
    
    this.data[index] = newData;
    
    // Clear cached height for this item
    this.itemHeights.delete(index);
    
    // Re-render if item is currently visible
    if (index >= this.startIndex && index <= this.endIndex) {
      this.renderItem(index);
    }
    
    // Recalculate total height
    this.calculateTotalHeight();
  }

  /**
   * Insert item at index
   */
  insertItem(index, data) {
    this.data.splice(index, 0, data);
    
    // Shift cached heights
    const newHeights = new Map();
    for (const [itemIndex, height] of this.itemHeights.entries()) {
      newHeights.set(itemIndex >= index ? itemIndex + 1 : itemIndex, height);
    }
    this.itemHeights = newHeights;
    
    this.calculateTotalHeight();
    this.render();
  }

  /**
   * Remove item at index
   */
  removeItem(index) {
    if (index < 0 || index >= this.data.length) return;
    
    this.data.splice(index, 1);
    
    // Clean up cached heights
    this.itemHeights.delete(index);
    const newHeights = new Map();
    for (const [itemIndex, height] of this.itemHeights.entries()) {
      if (itemIndex > index) {
        newHeights.set(itemIndex - 1, height);
      } else if (itemIndex < index) {
        newHeights.set(itemIndex, height);
      }
    }
    this.itemHeights = newHeights;
    
    this.calculateTotalHeight();
    this.render();
  }

  /**
   * Handle scroll events with throttling
   */
  handleScroll() {
    this.metrics.scrollEvents++;
    
    if (!this.isScrolling) {
      this.isScrolling = true;
      this.handleScrollStart();
    }

    // Clear existing timeout
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }

    // Use RAF for smooth scrolling
    if (!this.rafId) {
      this.rafId = requestAnimationFrame(() => {
        this.updateScrollPosition();
        this.rafId = null;
      });
    }

    // Set timeout for scroll end
    this.scrollTimeout = setTimeout(() => {
      this.isScrolling = false;
      this.handleScrollEnd();
    }, 150);
  }

  /**
   * Update scroll position and render visible items
   */
  updateScrollPosition() {
    const newScrollTop = this.container.scrollTop;
    
    if (Math.abs(newScrollTop - this.scrollTop) < 1) return;
    
    this.scrollTop = newScrollTop;
    
    // Calculate visible range
    const startIndex = this.getStartIndex();
    const endIndex = this.getEndIndex(startIndex);
    
    // Only re-render if visible range changed significantly
    if (Math.abs(startIndex - this.startIndex) > this.options.threshold ||
        Math.abs(endIndex - this.endIndex) > this.options.threshold) {
      this.render();
    }

    // Callback for scroll events
    if (this.options.onScroll) {
      this.options.onScroll({
        scrollTop: this.scrollTop,
        startIndex,
        endIndex,
        visibleItems: endIndex - startIndex + 1
      });
    }
  }

  /**
   * Handle container resize
   */
  handleResize() {
    this.updateContainerHeight();
    this.render();
  }

  /**
   * Handle intersection changes for visibility tracking
   */
  handleIntersection(entries) {
    if (this.options.onVisibilityChange) {
      entries.forEach(entry => {
        const index = parseInt(entry.target.dataset.index);
        this.options.onVisibilityChange({
          index,
          item: this.data[index],
          isVisible: entry.isIntersecting,
          visibilityRatio: entry.intersectionRatio
        });
      });
    }
  }

  /**
   * Calculate total height of all items
   */
  calculateTotalHeight() {
    let height = 0;
    
    for (let i = 0; i < this.data.length; i++) {
      height += this.getItemHeight(i);
    }
    
    this.totalHeight = height;
    this.spacerElement.style.height = `${this.totalHeight}px`;
  }

  /**
   * Get height of specific item
   */
  getItemHeight(index) {
    if (this.itemHeights.has(index)) {
      return this.itemHeights.get(index);
    }
    
    if (this.options.getItemHeight) {
      const height = this.options.getItemHeight(this.data[index], index);
      this.itemHeights.set(index, height);
      return height;
    }
    
    return this.options.itemHeight || this.options.estimatedItemHeight;
  }

  /**
   * Get start index for current scroll position
   */
  getStartIndex() {
    if (this.data.length === 0) return 0;
    
    let offset = 0;
    let index = 0;
    
    while (index < this.data.length && offset + this.getItemHeight(index) < this.scrollTop) {
      offset += this.getItemHeight(index);
      index++;
    }
    
    return Math.max(0, index - this.options.overscan);
  }

  /**
   * Get end index for current scroll position
   */
  getEndIndex(startIndex) {
    if (this.data.length === 0) return 0;
    
    let offset = 0;
    
    // Calculate offset to start index
    for (let i = 0; i < startIndex; i++) {
      offset += this.getItemHeight(i);
    }
    
    let index = startIndex;
    const viewportBottom = this.scrollTop + this.containerHeight;
    
    while (index < this.data.length && offset < viewportBottom) {
      offset += this.getItemHeight(index);
      index++;
    }
    
    return Math.min(this.data.length - 1, index + this.options.overscan);
  }

  /**
   * Main render function
   */
  render() {
    const startTime = performance.now();
    
    this.startIndex = this.getStartIndex();
    this.endIndex = this.getEndIndex(this.startIndex);
    
    // Calculate offset for viewport positioning
    let offset = 0;
    for (let i = 0; i < this.startIndex; i++) {
      offset += this.getItemHeight(i);
    }
    
    // Position viewport
    this.viewport.style.transform = `translateY(${offset}px)`;
    
    // Track currently rendered items
    const currentItems = new Set();
    
    // Render visible items
    for (let i = this.startIndex; i <= this.endIndex; i++) {
      currentItems.add(i);
      
      if (!this.renderedItems.has(i)) {
        this.renderItem(i);
      }
    }
    
    // Remove items that are no longer visible
    for (const [index, element] of this.renderedItems.entries()) {
      if (!currentItems.has(index)) {
        this.removeRenderedItem(index, element);
      }
    }
    
    // Update metrics
    const renderTime = performance.now() - startTime;
    this.metrics.renderCount++;
    this.metrics.lastRenderTime = renderTime;
    this.metrics.totalRenderTime += renderTime;
    this.metrics.averageRenderTime = this.metrics.totalRenderTime / this.metrics.renderCount;
    this.metrics.itemsRendered = currentItems.size;
  }

  /**
   * Render individual item
   */
  renderItem(index) {
    if (index < 0 || index >= this.data.length) return;
    
    const item = this.data[index];
    let element = this.renderedItems.get(index);
    
    if (!element) {
      element = document.createElement('div');
      element.style.position = 'absolute';
      element.style.top = '0';
      element.style.left = '0';
      element.style.right = '0';
      element.style.willChange = 'contents';
      element.dataset.index = index;
      
      this.viewport.appendChild(element);
      this.renderedItems.set(index, element);
      
      // Set up intersection observing
      if (this.intersectionObserver) {
        this.intersectionObserver.observe(element);
      }
    }
    
    // Calculate position
    let offset = 0;
    for (let i = this.startIndex; i < index; i++) {
      offset += this.getItemHeight(i);
    }
    element.style.transform = `translateY(${offset}px)`;
    
    // Set height
    const height = this.getItemHeight(index);
    element.style.height = `${height}px`;
    
    // Render content
    if (this.options.renderItem) {
      const content = this.options.renderItem(item, index);
      
      if (typeof content === 'string') {
        element.innerHTML = content;
      } else if (content instanceof Element) {
        element.innerHTML = '';
        element.appendChild(content);
      }
      
      // Measure actual height if not specified
      if (!this.itemHeights.has(index) || this.options.getItemHeight) {
        requestAnimationFrame(() => {
          const actualHeight = element.offsetHeight;
          if (actualHeight !== height) {
            this.itemHeights.set(index, actualHeight);
            this.calculateTotalHeight();
          }
        });
      }
    }
  }

  /**
   * Remove rendered item
   */
  removeRenderedItem(index, element) {
    if (this.intersectionObserver) {
      this.intersectionObserver.unobserve(element);
    }
    
    this.viewport.removeChild(element);
    this.renderedItems.delete(index);
  }

  /**
   * Update container height
   */
  updateContainerHeight() {
    this.containerHeight = this.container.clientHeight;
  }

  /**
   * Handle scroll start
   */
  handleScrollStart() {
    this.container.style.pointerEvents = 'none';
    
    // Add scrolling class for CSS optimizations
    this.container.classList.add('virtual-scrolling');
  }

  /**
   * Handle scroll end
   */
  handleScrollEnd() {
    this.container.style.pointerEvents = '';
    
    // Remove scrolling class
    this.container.classList.remove('virtual-scrolling');
    
    // Force a final render to ensure accuracy
    this.render();
  }

  /**
   * Scroll to specific item
   */
  scrollToItem(index, alignment = 'start') {
    if (index < 0 || index >= this.data.length) return;
    
    let offset = 0;
    
    // Calculate offset to item
    for (let i = 0; i < index; i++) {
      offset += this.getItemHeight(i);
    }
    
    let scrollTop;
    const itemHeight = this.getItemHeight(index);
    
    switch (alignment) {
      case 'start':
        scrollTop = offset;
        break;
      case 'center':
        scrollTop = offset - (this.containerHeight - itemHeight) / 2;
        break;
      case 'end':
        scrollTop = offset - (this.containerHeight - itemHeight);
        break;
      default:
        scrollTop = offset;
    }
    
    this.container.scrollTop = Math.max(0, Math.min(scrollTop, this.totalHeight - this.containerHeight));
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      dataLength: this.data.length,
      visibleItems: this.endIndex - this.startIndex + 1,
      renderedItems: this.renderedItems.size,
      cachedHeights: this.itemHeights.size,
      totalHeight: this.totalHeight,
      containerHeight: this.containerHeight,
      scrollTop: this.scrollTop
    };
  }

  /**
   * Refresh all items
   */
  refresh() {
    this.itemHeights.clear();
    this.calculateTotalHeight();
    this.render();
  }

  /**
   * Destroy virtual scroller and clean up
   */
  destroy() {
    // Cancel any pending RAF
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    
    // Clear timeout
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
    
    // Disconnect observers
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
    
    // Remove event listeners
    this.container.removeEventListener('scroll', this.handleScroll.bind(this));
    
    if (!this.resizeObserver) {
      window.removeEventListener('resize', this.handleResize.bind(this));
    }
    
    // Clean up DOM
    this.container.innerHTML = '';
    
    // Clear data
    this.data = [];
    this.renderedItems.clear();
    this.itemHeights.clear();
    
    console.log('Virtual scroller destroyed');
  }
}

/**
 * Factory function for creating virtual scrollers
 */
export function createVirtualScroller(container, options = {}) {
  return new VirtualScroller(container, options);
}