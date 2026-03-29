$(function () {
  // 관심고객등록 페이지에서는 제외
  if (/\/wish\//.test(location.pathname)) return;
  // 메인페이지 제외
  if (location.pathname === '/' || /\/index\.htm/i.test(location.pathname)) return;
  // 모바일만 (1099px 이하)
  if (window.innerWidth > 1099) return;

  var bar = $(
    '<div id="mo-bottom-bar">' +
      '<a href="/wish/wish.php" class="mo-bb-link mo-bb-wish">관심고객등록(방문예약)</a>' +
      '<a href="tel:1833-6809" class="mo-bb-link mo-bb-tel"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="#fff" style="margin-right:5px"><path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24 11.36 11.36 0 003.58.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1 11.36 11.36 0 00.57 3.58 1 1 0 01-.24 1.01l-2.2 2.2z"/></svg>1833-6809</a>' +
    '</div>'
  );

  $('body').append(bar).css('padding-bottom', '50px');
});
