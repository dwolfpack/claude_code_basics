# Shadow Step has moved

The ninja runner that used to live here now has its own repository:

**https://github.com/dwolfpack/shadow-step** · play at **https://dwolfpack.github.io/shadow-step/**

`index.html` in this folder forwards to the new address, carrying any `?by=&best=`
challenge parameters so links shared from the old URL still work. `sw.js` is a
retired service worker that clears the cache the old build left in visitors'
browsers and then unregisters itself.
