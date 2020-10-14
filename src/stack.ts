/**
 * stack.js
 * http://www.imabhi.in
 *
 * Licensed under the MIT license.
 * http://www.opensource.org/licenses/mit-license.php
 *
 * Copyright 2015, Codrops
 * http://www.codrops.com
 *
 * Migrated to TypeScript by Joseph Chamochumbi
 *
 */

// TODO: Remove dependency on dynamic.js
import dynamics from 'dynamics.js';

const onEndAnimation = (el: HTMLElement, callback: () => void) => {
  const onEndCallbackFn = (ev: Event) => {
    if (ev.target !== el) return;

    el.removeEventListener('animationend', onEndCallbackFn);

    if (callback && typeof callback === 'function') {
      callback();
    }
  };

  el.addEventListener('animationend', onEndCallbackFn);
};

type Animation = {
  // if true, then the settings.properties parameter will be distributed through the items in a non equal fashion
  // for instance, if we set settings.properties = {translateX:100} and we have visible = 4,
  // then the second item on the stack will translate 100px, the second one 75px and the third 50px
  elastic: boolean;
  // object that is passed into the dynamicsjs animate function - second parameter -  (see more at http://dynamicsjs.com/)
  animationProperties: Record<string, number>;
  // object that is passed into the dynamicsjs animate function (see more at http://dynamicsjs.com/)
  animationSettings: { complete: () => void };
};

type Options = {
  // stack's perspective value
  perspective: number;
  // stack's perspective origin
  perspectiveOrigin: string;
  // infinite navigation
  infinite: boolean;
  // number of visible items in the stack
  visible: number;
  // callback: when reaching the end of the stack
  onEndStack: () => void;
  // animation settings for the items' movements in the stack when the items rearrange
  // object that is passed to the dynamicsjs animate function (see more at http://dynamicsjs.com/)
  // example:
  // {type: dynamics.spring,duration: 1641,frequency: 557,friction: 459,anticipationSize: 206,anticipationStrength: 392}
  stackItemsAnimation: {
    duration: number;
    type: typeof dynamics.bezier;
    points: { x: number; y: number; cp: { x: number; y: number }[] }[];
  };
  // delay for the items' rearrangement / delay before stackItemsAnimation is applied
  stackItemsAnimationDelay: number;
  // animation settings for the items' movements in the stack before the rearrangement
  // we can set up different settings depending on whether we are approving or rejecting an item
  stackItemsPreAnimation?: {
    reject: Animation;
    accept: Animation;
  };
};

const defaultOptions: Options = {
  perspective: 1000,
  perspectiveOrigin: '50% -50%',
  visible: 3,
  infinite: true,
  onEndStack: () => {},
  stackItemsAnimation: {
    duration: 500,
    type: dynamics.bezier,
    points: [
      { x: 0, y: 0, cp: [{ x: 0.25, y: 0.1 }] },
      { x: 1, y: 1, cp: [{ x: 0.25, y: 1 }] },
    ],
  },
  stackItemsAnimationDelay: 0,
};

const init = (
  el: HTMLElement,
  current: number,
  items: HTMLElement[],
  {
    perspective,
    perspectiveOrigin,
    visible,
  }: Pick<Options, 'perspective' | 'perspectiveOrigin' | 'visible'>
) => {
  if (!el) return;
  el.style.perspective = perspective + 'px';
  el.style.perspectiveOrigin = perspectiveOrigin;

  for (const index in items) {
    const item = items[index];

    if (parseInt(index) < visible) {
      item.style.opacity = '1';
      item.style.pointerEvents = 'auto';
      item.style.zIndex =
        parseInt(index) === 0
          ? `${visible + 1}`
          : `${visible - parseInt(index)}`;

      item.style.transform = `translate3d(
          0, 0,-${50 * parseInt(index)}px)`;
    } else {
      item.style.transform = `translate3d(
        0,0,-${visible * 50}px)`;
    }
  }

  items[current].classList.add('stack__item--current');
};

const normalizeVisible = (
  { visible, infinite }: Pick<Options, 'visible' | 'infinite'>,
  total: number
) => {
  if (visible <= 0) {
    return 1;
  }

  if (infinite) {
    if (visible >= total) {
      return 1;
    }
  } else {
    if (visible > total) {
      return 1;
    }
  }
  return visible;
};

const animate = (
  index: number,
  item: HTMLElement,
  element: HTMLElement,
  {
    visible,
    stackItemsAnimation,
  }: Pick<Options, 'visible' | 'stackItemsAnimation'>
) => {
  element.style.pointerEvents = 'auto';
  element.style.opacity = '1';
  element.style.zIndex = `${visible - index}`;

  dynamics.animate(
    item,
    {
      translateZ: -`${50 * index}`,
    },
    stackItemsAnimation
  );
};

export function Stack<T extends HTMLElement>(
  elem: T | null,
  opts: Partial<Options>
) {
  if (!elem) return null;

  const el = elem;

  const items = Array.from(el.children) as HTMLElement[];

  const itemsTotal = items.length;

  const options = { ...defaultOptions, ...opts };

  const {
    infinite,
    onEndStack,
    stackItemsAnimationDelay,
    stackItemsPreAnimation,
  } = options;

  const visible = normalizeVisible(options, itemsTotal);

  let current = 0;
  let hasEnded = false;
  let isAnimating = false;

  init(el, current, items, options);

  const _next = (action: 'accept' | 'reject', callback?: () => void) => {
    if (isAnimating || (!infinite && hasEnded)) return;
    isAnimating = true;

    // current item
    const currentItem = items[current];
    currentItem.classList.remove('stack__item--current');

    // add animation class
    currentItem.classList.add(
      action === 'accept' ? 'stack__item--accept' : 'stack__item--reject'
    );

    onEndAnimation(currentItem, () => {
      currentItem.style.opacity = '0';
      currentItem.style.pointerEvents = 'none';
      currentItem.style.zIndex = '-1';
      currentItem.style.transform = `
      translate3d(0px, 0px, -${visible * 50}px)`;

      currentItem.classList.remove(
        action === 'accept' ? 'stack__item--accept' : 'stack__item--reject'
      );

      currentItem.style.zIndex = `${visible + 1}`;
      isAnimating = false;

      if (callback) callback();

      if (!infinite && current === 0) {
        hasEnded = true;
        // callback
        onEndStack();
      }
    });

    for (let i = 0; i < itemsTotal; ++i) {
      if (i >= visible) break;

      let pos;
      if (!infinite) {
        if (current + i >= itemsTotal - 1) break;
        pos = current + i + 1;
      } else {
        pos =
          current + i < itemsTotal - 1
            ? current + i + 1
            : i - (itemsTotal - current - 1);
      }

      const item = items[pos];
      // stack items animation

      setTimeout(() => {
        let preAnimation;

        if (stackItemsPreAnimation) {
          preAnimation =
            action === 'accept'
              ? stackItemsPreAnimation.accept
              : stackItemsPreAnimation.reject;
        }

        if (preAnimation) {
          // items "pre animation" properties
          const animProps: Record<string, unknown> = {};

          for (let key in preAnimation.animationProperties) {
            let interval = preAnimation.elastic
              ? preAnimation.animationProperties[key] / visible
              : 0;
            animProps[key] =
              preAnimation.animationProperties[key] - Number(i * interval);
          }

          // this one remains the same..
          animProps.translateZ = -`${50 * (i + 1)}`;

          preAnimation.animationSettings.complete = () => {
            animate(i, item, el, options);
          };

          dynamics.animate(item, animProps, preAnimation.animationSettings);
        } else {
          animate(i, item, el, options);
        }
      }, stackItemsAnimationDelay);
    }

    current = current < itemsTotal - 1 ? current + 1 : 0;
    items[current].classList.add('stack__item--current');
  };

  const reject = (callback?: () => void) => {
    _next('reject', callback);
  };

  const accept = (callback?: () => void) => {
    _next('accept', callback);
  };

  const restart = () => {
    hasEnded = false;
    init(el, current, items, options);
  };
  return { accept, reject, restart };
}
