// ==UserScript==
// @name         Hordes Uninstall User
// @namespace    http://tampermonkey.net/
// @version      0.1.1
// @description  Because why not
// @author       Killboy
// @match        http://www.hordes.fr/*
// @icon         http://www.hordes.fr/gfx/icons/item_bullets.gif
// @grant        none
// @downloadURL  https://tmp-staticserver.herokuapp.com/hordes-uninstall-user/huu.user.js
// @updateURL    https://tmp-staticserver.herokuapp.com/hordes-uninstall-user/huu.meta.js
// @require      https://tmp-staticserver.herokuapp.com/lib/KHLib-0.4.2.js
// ==/UserScript==

(function() {
  "use strict";

  const KhLib = window.KhLib.core.copy();
  KhLib.checkDependencies(KhLib, ["onGameUpdate", "dom"], "KhLib");
  const dom = KhLib.dom;

  const state = {
    initialized: false,
    forumInit: false,
  };

  const warnList = ["1735033", "1730724"];

  const store = KhLib.createStore("huu", {
    uninstalled: [],
  });

  const displayNotification = (text, action) => {
    dom.query("#notificationText").text(text);
    if (action) {
      dom.query("#notification .button").on("click", action);
    }
    dom
      .query("#notification")
      .addClass("showNotif")
      .css("position", "fixed");
  };

  function resetUsers() {
    const users = store.get().uninstalled.map((u) => u.name);

    store.set({ uninstalled: [] });
    displayNotification(
      `Réinstallation de ${users.join(
        ", "
      )} terminé. Profitez de votre Hordes avec virus.`,
      () => location.reload()
    );
  }

  function getButtonFor(uid, name) {
    const uninstalled = store.get().uninstalled.some((u) => u.id === uid);

    if (!uninstalled) {
      const button = dom.query(
        `<a class="button" >Désinstaller <strong>${name}</strong></a>`
      );

      function uninstallUser() {
        store.set({
          uninstalled: [...store.get().uninstalled, { id: uid, name }],
        });
        displayNotification(
          `Désinstallation de ${name} terminé. Profitez de votre Hordes sans virus.`,
          () => location.reload()
        );
      }

      button.on("click", uninstallUser);

      return button;
    } else {
      const button = dom.query(
        `<a class="button" >Installer <strong>${name}</strong></a>`
      );

      function installUser() {
        store.set({
          uninstalled: store.get().uninstalled.filter((u) => u.id !== uid),
        });
        displayNotification(
          `Installation de ${name} terminé. Profitez de votre Hordes avec virus.`,
          () => location.reload()
        );
      }

      button.on("click", installUser);

      return button;
    }
  }

  function getButton() {
    const soulBtn = dom.query(".button:contains('Voir son âme')");
    if (soulBtn.length) {
      const uid = dom
        .query(".button:contains('Voir son âme')")
        .attr("href")
        .split("=")[1]
        .split(";")[0];
      const name = dom
        .query("p:contains('Selon les rumeurs, le citoyen ')")
        .text()
        .replace(":", "")
        .split(" ")
        .slice(-1)[0];

      return getButtonFor(uid, name);
    }
  }

  function uninstallAll() {
    store.get().uninstalled.forEach((user) => {
      console.log("Uninstall", user.name);
      const re = new RegExp(user.name, "g");

      dom
        .query(`".tid_header .tid_user:contains('${user.name}')`)
        .each(function() {
          const it = dom.query(this);

          if (window.location.hash.startsWith("#!view/")) {
            it.parent()
              .parent()
              .parent()
              .css("opacity", "10%")
              .css("max-height", "30px")
              .css("overflow", "hidden");

            it.parent()
              .parent()
              .css("display", "none");
          } else {
            it.html(it.html().replace(re, "Désinstallé"));
          }
        });

      if (!window.location.hash.startsWith("#!view/")) {
        dom.query(`.entry strong:contains('${user.name}')`).html("Désintallé");
        dom.query(`.tid_avatarImg[alt='${user.name}']`).attr("src", "");

        dom.query(`#gamebody:contains('${user.name}')`).each(function() {
          const it = dom.query(this);
          it.html(it.html().replace(re, "Désinstallé"));
        });
      }
    });
  }

  function injectForumOptions() {
    const users = store.get().uninstalled.map((u) => u.name);
    const disabled = !users.length;

    if (dom.query("div[data-id='" + "huu-forum-actions" + "']").length) {
      return;
    }

    const resetButton = dom.query(
      disabled
        ? "<p>Action non disponible.</p>"
        : `<a class="button" >Réinstaller <strong>tout</strong> le monde</a>`
    );

    if (!disabled) {
      resetButton.on("click", resetUsers);
    }

    const actions = dom.createElement(
      "div",
      {
        class: "tid_forumRules tid_bg1",
        style: "margin-top: 1rem;",
        "data-id": "huu-forum-actions",
      },
      {},
      dom.createElement("p", {}, {}, "Hordes Uninstall User :"),
      dom.createElement(
        "ul",
        {},
        {},
        dom.query(
          `<li><p>Vous avez désinstallé <strong>${users.length}</strong> joueurs.</p></li>`
        ),
        dom.createElement("li", {}, {}, resetButton)
      )
    );

    dom.insertContent(dom.query(".tid_forumRules"), actions);
  }

  function setForumActions() {
    uninstallAll();

    injectForumOptions();

    dom.query("#tid_forum_right  .tid_header").each(function() {
      const elem = dom.query(this);
      const uid = elem.find(".tid_name a").attr("tid_id");
      const name = elem.find(".tid_name a").text();
      const uninstalled = store.get().uninstalled.some((u) => u.id === uid);

      if (elem.find("[data-uid='" + uid + "']").length) {
        return;
      }

      const button = getButtonFor(uid, name);

      button.attr("class", "");
      button.attr("data-uid", uid);

      if (uninstalled) {
        elem
          .parent()
          .find(".tid_body")
          .before(button);
      } else {
        elem.find(".tid_date").append(dom.query("<br>"));
        elem.find(".tid_date").append(button);
      }
    });
  }

  const refresh = () => {
    const button = getButton();

    const userToWarn = warnList.some(
      (id) => dom.query(`.tid_name[href="//twinoid.com/user/${id}"]`).length
    );

    if (userToWarn) {
      displayNotification(`Comment ça le script d'Eliam?`, () => {});
    }

    uninstallAll();
    if (dom.query(".left .button:contains('dénonciation')").length) {
      dom.query(".left .button:contains('dénonciation')").after(button);
    }
    setForumActions();
  };

  const tryBindToForum = () => {
    if (!state.forumInit && !state.forumIsLoading) {
      state.forumIsLoading = true;
      KhLib.onForumUpdate(setForumActions)
        .then(() => {
          state.forumInit = true;
        })
        .catch(() => {
          state.forumIsLoading = false;
        });
    }
  };

  const load = () => {
    if (!state.initialized) {
      KhLib.onHashChange(tryBindToForum);
      KhLib.onGameUpdate(refresh);

      setTimeout(() => {
        tryBindToForum();
        setForumActions();
      }, 2 * 1000);

      state.initialized = true;
      refresh();
    }
  };
  KhLib.ready(() => {
    load();
  });
})();
