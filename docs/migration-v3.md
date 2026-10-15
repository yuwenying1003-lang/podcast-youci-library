# Upgrade from v2.3

1. Export notes from v2.3 if they matter; v2.3 and v3 use different storage keys and
   automatic migration cannot be guaranteed across the extension-to-web origin change.
2. Disable or remove v2.3 to prevent duplicate panels.
3. Extract the appropriate v3 ZIP.
4. Desktop: open `chrome://extensions` or `edge://extensions`, enable Developer mode,
   and choose **Load unpacked**.
5. Yandex Android: enable desktop-site mode for ListenLeap, open the extension manager,
   enable developer mode if required, and load the extracted Yandex package.
6. Open the Cornell 7 ListenLeap URL and select **Study**.

The course URL and podcast ID are unchanged. Future UI and course updates arrive after
refresh without reinstalling v3. Only bridge/permission/protocol changes need a package
upgrade.
