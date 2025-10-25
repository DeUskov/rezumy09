@@ .. @@
       
       {/* 🔧 РЕЖИМ РАЗРАБОТКИ: Индикатор деактивированной аутентификации */}
-      {DEV_MODE_SKIP_AUTH && (
+      {DEV_MODE_SKIP_AUTH && import.meta.env.DEV && (
         <div className="fixed top-4 left-4 z-50 bg-yellow-500/20 border border-yellow-500/40 rounded-xl px-3 py-2">
           <p className="text-yellow-400 text-xs font-medium">
             🔧 DEV MODE: Auth Disabled