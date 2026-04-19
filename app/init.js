'use strict';

// Create anchores for every heading
const anchorize = () => {
  const sel = 'h1[id],h2[id],h3[id],h4[id],h5[id],h6[id]';
  const headers = [...document.querySelectorAll(sel)];
  headers.forEach(header => {
    const id = header.id;
    header.id = '';
    header.innerHTML += `<a name="${id}">&nbsp;</a>`;
  });
};

// Generate content of table
const toc = (contentClass, fallbackContentClass, tableClass) => {
  const art = document.getElementsByClassName(contentClass)[0] ||
      document.getElementsByClassName(fallbackContentClass)[0];

  if (!art) return;

  const els = [...art.childNodes]
    .filter(el => el.tagName === 'H2' || el.tagName === 'H3');

  if (!els.length) return;

  const grouped = els.reduce((memo, el) => {
    // FIXME: Need to fix this reducer
    if (el.tagName === 'H2') {
      memo.push([el]);
    } else {
      var last = memo[memo.length - 1];
      if (!last) return memo;
      last.push(el);
    }
    return memo;
  }, []);

  const tocHTML = `
    <ul className="toc">
      ${grouped.map(([main, ...children]) => `
        <li>
          <a href="#${main.id}">${main.innerHTML}</a>
          ${children.length === 0 ? '' : `
            <ul>
              ${children.map(child =>
                `<li><a href="#${child.id}">${child.innerHTML}</a></li>`
              ).join('\n')}
            </ul>
          `}
        </li>
      `).join('\n')}
    </ul>
  `;

  [...document.getElementsByClassName(tableClass)].forEach(placeholder => {
    placeholder.innerHTML = tocHTML;
  });
};

// Set title of page
const setTitle = contentClass => {
  const art = document.getElementsByClassName(contentClass)[0];
  if (!art) return;
  const heading = art.getElementsByTagName('h1')[0];
  if (!heading) return;
  document.title = `${heading.textContent} — Brunch`;
};

// Set up attributes for iframes
const deferIframe = () => {
  [...document.querySelectorAll('.defer-iframe')].forEach(deferIframe => {
    const iframe = document.createElement('iframe');

    iframe.allowFullscreen = '';
    iframe.frameBorder = 0;

    Object.keys(deferIframe.dataset).forEach(key => {
      iframe.setAttribute(key, deferIframe.dataset[key]);
    });

    deferIframe.appendChild(iframe);
  });
};

// Just a small hack
// Add `.html` extansion for each of internal links
// Fix for: https://github.com/brunch/brunch.github.io/issues/233
if (process.env.NODE_ENV === 'development') {
  [...document.querySelectorAll('a[href]')]
    .filter(({pathname}) => !pathname.includes('.')) // already has extension
    .filter(({pathname}) => pathname !== '/' && pathname.startsWith('/'))
    .forEach(link => link.href += '.html'); // eslint-disable-line
}

// Entry points
setTitle('page__content');
toc('doc-content', 'page__content', 'toc-placeholder');
anchorize();
deferIframe();
