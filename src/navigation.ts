const setupNavigation = () => {
  const toggle = document.getElementById('menu-toggle') as HTMLButtonElement | null;
  const nav = document.getElementById('site-nav') as HTMLElement | null;

  if (!toggle || !nav) {
    return;
  }

  if (nav.dataset.navInitialised === 'true') {
    return;
  }
  nav.dataset.navInitialised = 'true';

  const closeNav = () => {
    nav.dataset.open = 'false';
    toggle.setAttribute('aria-expanded', 'false');
  };

  const openNav = () => {
    nav.dataset.open = 'true';
    toggle.setAttribute('aria-expanded', 'true');
  };

  const toggleNav = () => {
    if (nav.dataset.open === 'true') {
      closeNav();
    } else {
      openNav();
    }
  };

  toggle.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleNav();
  });

  document.addEventListener('click', (event) => {
    if (nav.dataset.open !== 'true') {
      return;
    }

  if (event.target instanceof Node && (nav.contains(event.target) || toggle.contains(event.target))) {
      return;
    }

    closeNav();
  });

  const links = Array.from(nav.querySelectorAll('a')) as HTMLAnchorElement[];
  links.forEach((link) => {
    link.addEventListener('click', () => {
      if (window.matchMedia('(max-width: 767px)').matches) {
        closeNav();
      }
    });
  });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupNavigation, { once: true });
} else {
  setupNavigation();
}
