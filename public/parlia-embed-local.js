!(function (e) {
    var t = {};
    function r(n) {
      if (t[n]) return t[n].exports;
      var a = (t[n] = { i: n, l: !1, exports: {} });
      return e[n].call(a.exports, a, a.exports, r), (a.l = !0), a.exports;
    }
    (r.m = e),
      (r.c = t),
      (r.d = function (e, t, n) {
        r.o(e, t) || Object.defineProperty(e, t, { enumerable: !0, get: n });
      }),
      (r.r = function (e) {
        "undefined" != typeof Symbol && Symbol.toStringTag && Object.defineProperty(e, Symbol.toStringTag, { value: "Module" }), Object.defineProperty(e, "__esModule", { value: !0 });
      }),
      (r.t = function (e, t) {
        if ((1 & t && (e = r(e)), 8 & t)) return e;
        if (4 & t && "object" == typeof e && e && e.__esModule) return e;
        var n = Object.create(null);
        if ((r.r(n), Object.defineProperty(n, "default", { enumerable: !0, value: e }), 2 & t && "string" != typeof e))
          for (var a in e)
            r.d(
              n,
              a,
              function (t) {
                return e[t];
              }.bind(null, a)
            );
        return n;
      }),
      (r.n = function (e) {
        var t =
          e && e.__esModule
            ? function () {
                return e.default;
              }
            : function () {
                return e;
              };
        return r.d(t, "a", t), t;
      }),
      (r.o = function (e, t) {
        return Object.prototype.hasOwnProperty.call(e, t);
      }),
      (r.p = ""),
      r((r.s = 0));
  })([
    function (e, t) {
      function r() {
        for (var e = Array.from(document.getElementsByClassName("parlia-embed")), t = 0; t < e.length; t++) {
          var r = e[t],
            i = r.getElementsByTagName("a");
          if (1 != i.length) throw new Error("parlia-embed: expected to only find one link as child of parlia-embed");
          var o = i[0].href,
            l = n(o),
            d = "";
          true && (d = "display: inline-block;");
          var c = a(
            '<div class="parlia-embed-outer" style="width: 100%; max-width: 370px; margin: 10px 0; ' +
              d +
              '"><iframe class="parlia-embed-iframe" src="' +
              l +
              '" data-hj-allow-iframe style="height: 460px; width:100%; max-width: 370px; display: block;" frameborder="0" allowfullscreen scrolling="no" allowtransparency="true"></iframe><div class="parlia-embed-tagline" style="font-family: sans-serif; text-align: center; font-size: 16px;"><a href="' +
              o +
              '">Improving civil discourse</a> with <a href="https://www.parlia.com/">Parlia</a></div></div>'
          );
          r.replaceWith(c);
        }
      }
      function n(e) {
        var t = new URL(e);
        if (!/[a-z0-9-\/]/.test(t.pathname)) throw new Error("parlia-embed: invalid path");
        if (0 === t.pathname.lastIndexOf("/embed/", 0)) throw new Error("parlia-embed: URL must be article URL, not /embed/ URL");
        return (t.pathname = "/embed" + t.pathname), t.href;
      }
      function a(e) {
        var t = document.createElement("template");
        t.innerHTML = e.trim();
        var r = t.content.firstElementChild;
        if (!r) throw new Error("parlia-embed: creating iframe element failed");
        return r;
      }
      window.parliaEmbed || /(MSIE ([6789]|10|11))|Trident/.test(navigator.userAgent) || ((window.parliaEmbed = !0), /complete|interactive|loaded/.test(document.readyState) ? r() : document.addEventListener("DOMContentLoaded", r, !1));
    },
  ]);
  