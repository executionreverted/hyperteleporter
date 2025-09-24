import { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import { ExpandableDriveCard } from './expandable-drive-card';

const useMedia = (queries, values, defaultValue) => {
  const get = () => values[queries.findIndex(q => matchMedia(q).matches)] ?? defaultValue;

  const [value, setValue] = useState(get);

  useEffect(() => {
    const handler = () => setValue(get);
    queries.forEach(q => matchMedia(q).addEventListener('change', handler));
    return () => queries.forEach(q => matchMedia(q).removeEventListener('change', handler));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queries]);

  return value;
};

const useMeasure = () => {
  const ref = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const roRef = useRef(null);

  useLayoutEffect(() => {
    if (!ref.current) return;
    
    // Create ResizeObserver only once
    if (!roRef.current) {
      roRef.current = new ResizeObserver(([entry]) => {
        const { width, height } = entry.contentRect;
        setSize(prev => {
          // Only update if size actually changed to prevent unnecessary re-renders
          if (prev.width !== width || prev.height !== height) {
            return { width, height };
          }
          return prev;
        });
      });
    }
    
    roRef.current.observe(ref.current);
    return () => {
      if (roRef.current) {
        roRef.current.disconnect();
      }
    };
  }, []);

  return [ref, size];
};

const preloadImages = async urls => {
  await Promise.all(
    urls.map(
      src =>
        new Promise(resolve => {
          const img = new Image();
          img.src = src;
          img.onload = img.onerror = () => resolve(undefined);
        })
    )
  );
};

const Masonry = ({
  items,
  ease = 'power3.out',
  duration = 0.6,
  stagger = 0.05,
  animateFrom = 'bottom',
  scaleOnHover = true,
  hoverScale = 0.95,
  blurToFocus = true,
  colorShiftOnHover = false,
  isAnimating = false
}) => {
  const columns = useMedia(
    ['(min-width:1500px)', '(min-width:1000px)', '(min-width:600px)', '(min-width:400px)'],
    [3, 3, 3, 2],
    1
  );

  // @ts-ignore
  const [containerRef, { width }] = useMeasure();
  const [imagesReady, setImagesReady] = useState(false);
  const [isMasonryAnimating, setIsMasonryAnimating] = useState(false);
  const animationTimeoutRef = useRef(null);
  const elementCacheRef = useRef(new Map()); // Cache DOM elements for better performance

  const getInitialPosition = item => {
    // @ts-ignore
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return { x: item.x, y: item.y };

    let direction = animateFrom;
    if (animateFrom === 'random') {
      const dirs = ['top', 'bottom', 'left', 'right'];
      direction = dirs[Math.floor(Math.random() * dirs.length)];
    }

    switch (direction) {
      case 'top':
        return { x: item.x, y: -200 };
      case 'bottom':
        return { x: item.x, y: window.innerHeight + 200 };
      case 'left':
        return { x: -200, y: item.y };
      case 'right':
        return { x: window.innerWidth + 200, y: item.y };
      case 'center':
        return {
          x: containerRect.width / 2 - item.w / 2,
          y: containerRect.height / 2 - item.h / 2
        };
      default:
        return { x: item.x, y: item.y + 100 };
    }
  };

  useEffect(() => {
    preloadImages(items.map(i => i.img)).then(() => setImagesReady(true));
  }, [items]);

  // Debounced animation function to prevent rapid re-layouts
  const debouncedAnimate = useCallback((gridItems) => {
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }
    
    // Don't animate if expand/collapse animation is still running
    if (isAnimating) {
      return;
    }
    
    animationTimeoutRef.current = setTimeout(() => {
      // Double-check animation state before proceeding
      if (isAnimating) {
        return;
      }
      
      setIsMasonryAnimating(true);
      
      gridItems.forEach((item, index) => {
        // Use cached element instead of selector query
        let element = elementCacheRef.current.get(item.id);
        if (!element) {
          element = document.querySelector(`[data-key="${item.id}"]`);
          if (element) {
            elementCacheRef.current.set(item.id, element);
          }
        }

        if (element) {
          const animProps = { x: item.x, y: item.y, width: item.w, height: item.h };

          gsap.to(element, {
            ...animProps,
            duration: duration * 0.6, // Faster for better performance
            ease: 'power2.out',
            overwrite: 'auto',
            onComplete: () => {
              if (index === gridItems.length - 1) {
                setIsMasonryAnimating(false);
              }
            }
          });
        }
      });
    }, 10); // Very fast debounce for immediate response
  }, [duration, isAnimating]);

  const grid = useMemo(() => {
    if (!width) return [];
    const colHeights = new Array(columns).fill(0);
    const gap = 16;
    const totalGaps = (columns - 1) * gap;
    const columnWidth = (width - totalGaps) / columns;

    return items.map(child => {
      // Find the shortest column more efficiently
      let shortestCol = 0;
      let minHeight = colHeights[0];
      for (let i = 1; i < columns; i++) {
        if (colHeights[i] < minHeight) {
          minHeight = colHeights[i];
          shortestCol = i;
        }
      }

      const x = shortestCol * (columnWidth + gap);
      const height = child.height;
      const y = colHeights[shortestCol];

      colHeights[shortestCol] += height + gap;
      return { ...child, x, y, w: columnWidth, h: height };
    });
  }, [columns, items, width]);

  const hasMounted = useRef(false);

  useLayoutEffect(() => {
    if (!imagesReady) return;

    if (!hasMounted.current) {
      // Initial mount animation
      grid.forEach((item, index) => {
        const element = document.querySelector(`[data-key="${item.id}"]`);
        if (element) {
          // Cache the element for future use
          elementCacheRef.current.set(item.id, element);
          
          const animProps = { x: item.x, y: item.y, width: item.w, height: item.h };
          const start = getInitialPosition(item);
          
          gsap.fromTo(
            element,
            {
              opacity: 0,
              x: start.x,
              y: start.y,
              width: item.w,
              height: item.h,
              ...(blurToFocus && { filter: 'blur(10px)' })
            },
            {
              opacity: 1,
              ...animProps,
              ...(blurToFocus && { filter: 'blur(0px)' }),
              duration: 0.6, // Faster initial animation
              ease: 'power2.out',
              delay: index * stagger
            }
          );
        }
      });
      hasMounted.current = true;
    } else {
      // Use debounced animation for layout changes
      debouncedAnimate(grid);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid, imagesReady, stagger, animateFrom, blurToFocus, duration, ease, debouncedAnimate]);

  // Cleanup timeout and cache on unmount or items change
  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  // Clear element cache when items change
  useEffect(() => {
    elementCacheRef.current.clear();
  }, [items]);

  const handleMouseEnter = (id, element) => {
    if (scaleOnHover && !isMasonryAnimating) {
      const cachedElement = elementCacheRef.current.get(id) || element;
      gsap.to(cachedElement, {
        scale: hoverScale,
        duration: 0.2, // Faster hover response
        ease: 'power2.out'
      });
    }
    if (colorShiftOnHover) {
      const overlay = element.querySelector('.color-overlay');
      if (overlay) gsap.to(overlay, { opacity: 0.3, duration: 0.2 });
    }
  };

  const handleMouseLeave = (id, element) => {
    if (scaleOnHover && !isMasonryAnimating) {
      const cachedElement = elementCacheRef.current.get(id) || element;
      gsap.to(cachedElement, {
        scale: 1,
        duration: 0.2, // Faster hover response
        ease: 'power2.out'
      });
    }
    if (colorShiftOnHover) {
      const overlay = element.querySelector('.color-overlay');
      if (overlay) gsap.to(overlay, { opacity: 0, duration: 0.2 });
    }
  };

  return (
    // @ts-ignore
    <div ref={containerRef} className="relative w-full h-full">
      {grid.map(item => (
        <div
          key={item.id}
          data-key={item.id}
          className="absolute box-content"
          style={{ 
            willChange: 'transform, width, height, opacity, z-index',
            zIndex: item.isExpanded ? 50 : 10, // Higher z-index for expanding cards
            transition: 'z-index 0.1s ease-in-out' // Smooth z-index transition
          }}
          onMouseEnter={e => handleMouseEnter(item.id, e.currentTarget)}
          onMouseLeave={e => handleMouseLeave(item.id, e.currentTarget)}
        >
          {item.drive ? (
            // Render drive card if drive data exists
            <div className="w-full h-full">
              <ExpandableDriveCard
                drive={item.drive}
                onBrowse={item.onBrowse}
                onShare={item.onShare}
                onDelete={item.onDelete}
                isExpanded={item.isExpanded}
                onExpandChange={item.onExpandChange}
                onExpandComplete={item.onExpandComplete}
                onCollapseComplete={item.onCollapseComplete}
                className="w-full h-full"
              />
            </div>
          ) : (
            // Fallback to original image rendering
            <div
              className="relative w-full h-full bg-cover bg-center rounded-[10px] shadow-[0px_10px_50px_-10px_rgba(0,0,0,0.2)] uppercase text-[10px] leading-[10px] cursor-pointer"
              style={{ backgroundImage: `url(${item.img})` }}
              onClick={() => window.open(item.url, '_blank', 'noopener')}
            >
              {colorShiftOnHover && (
                <div className="color-overlay absolute inset-0 rounded-[10px] bg-gradient-to-tr from-pink-500/50 to-sky-500/50 opacity-0 pointer-events-none" />
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default Masonry;
