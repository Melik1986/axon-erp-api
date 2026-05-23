sap.ui.define([], function () {
  "use strict";

  const OVERLAY =
    ".sapFePlaceholderContainer,.sapUiBlockLayer,.sapUiLocalBusyIndicatorSizeBig,.sapUiBLy";

  function getDocument(domRef) {
    if (domRef?.ownerDocument) {
      return domRef.ownerDocument;
    }
    const iframeDoc = document.querySelector("iframe")?.contentDocument;
    return iframeDoc || document;
  }

  function hasTableData(doc) {
    if (!doc) {
      return false;
    }
    if (
      doc.querySelectorAll(".sapMListTblRow, tbody tr[data-sap-ui-rowindex]")
        .length > 0
    ) {
      return true;
    }
    const text = doc.body?.innerText || "";
    return /\(\d+\)/.test(text) && text.includes("Product");
  }

  function releaseFromDom(domRef) {
    const doc = getDocument(domRef);
    if (!hasTableData(doc)) {
      return false;
    }
    doc.querySelectorAll(OVERLAY).forEach((node) => node.remove());
    doc.querySelectorAll('[aria-busy="true"]').forEach((node) => {
      node.setAttribute("aria-busy", "false");
    });
    return true;
  }

  function watchUntilReleased(domRef, maxTicks) {
    let ticks = 0;
    const timer = setInterval(() => {
      if (releaseFromDom(domRef) || ticks >= maxTicks) {
        clearInterval(timer);
      }
      ticks += 1;
    }, 200);
  }

  return {
    releaseFromDom: releaseFromDom,
    watchUntilReleased: watchUntilReleased,
  };
});
