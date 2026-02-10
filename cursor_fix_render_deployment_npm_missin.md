# Fix render deployment npm missing packages
_Exported on 12/6/2025 at 13:19:34 GMT+2 from Cursor (2.1.49)_

---

**User**

IT FAILED MISERABLY! It couldnt deploy it ON RENDER! See the logs! It's full of errors and fix them all! Here's what the logs are writing : 2025-12-06T10:29:48.516390309Z npm error Missing: @ckeditor/ckeditor5-special-characters@41.4.2 from lock file

2025-12-06T10:29:48.516391989Z npm error Missing: @ckeditor/ckeditor5-style@41.4.2 from lock file

2025-12-06T10:29:48.516393639Z npm error Missing: @ckeditor/ckeditor5-theme-lark@41.4.2 from lock file

2025-12-06T10:29:48.516396169Z npm error Missing: @ckeditor/ckeditor5-undo@41.4.2 from lock file

2025-12-06T10:29:48.516397989Z npm error Missing: @ckeditor/ckeditor5-upload@41.4.2 from lock file

2025-12-06T10:29:48.516399649Z npm error Missing: @ckeditor/ckeditor5-watchdog@41.4.2 from lock file

2025-12-06T10:29:48.516401289Z npm error Missing: @ckeditor/ckeditor5-widget@41.4.2 from lock file

2025-12-06T10:29:48.516402979Z npm error Missing: @ckeditor/ckeditor5-word-count@41.4.2 from lock file

2025-12-06T10:29:48.516404629Z npm error Missing: ckeditor5@41.4.2 from lock file

2025-12-06T10:29:48.516406299Z npm error Missing: @ckeditor/ckeditor5-alignment@41.4.2 from lock file

2025-12-06T10:29:48.516407969Z npm error Missing: @ckeditor/ckeditor5-autosave@41.4.2 from lock file

2025-12-06T10:29:48.516409609Z npm error Missing: @ckeditor/ckeditor5-clipboard@41.4.2 from lock file

2025-12-06T10:29:48.516411269Z npm error Missing: @ckeditor/ckeditor5-code-block@41.4.2 from lock file

2025-12-06T10:29:48.516412919Z npm error Missing: @ckeditor/ckeditor5-editor-decoupled@41.4.2 from lock file

2025-12-06T10:29:48.516418729Z npm error Missing: @ckeditor/ckeditor5-editor-inline@41.4.2 from lock file

2025-12-06T10:29:48.516420479Z npm error Missing: @ckeditor/ckeditor5-editor-multi-root@41.4.2 from lock file

2025-12-06T10:29:48.516422149Z npm error Missing: @ckeditor/ckeditor5-enter@41.4.2 from lock file

2025-12-06T10:29:48.516423829Z npm error Missing: @ckeditor/ckeditor5-find-and-replace@41.4.2 from lock file

2025-12-06T10:29:48.516425519Z npm error Missing: @ckeditor/ckeditor5-font@41.4.2 from lock file

2025-12-06T10:29:48.516427179Z npm error Missing: @ckeditor/ckeditor5-highlight@41.4.2 from lock file

2025-12-06T10:29:48.516428819Z npm error Missing: @ckeditor/ckeditor5-horizontal-line@41.4.2 from lock file

2025-12-06T10:29:48.516430499Z npm error Missing: @ckeditor/ckeditor5-html-embed@41.4.2 from lock file

2025-12-06T10:29:48.51643217Z npm error Missing: @ckeditor/ckeditor5-html-support@41.4.2 from lock file

2025-12-06T10:29:48.516439019Z npm error Missing: @ckeditor/ckeditor5-language@41.4.2 from lock file

2025-12-06T10:29:48.516440879Z npm error Missing: @ckeditor/ckeditor5-markdown-gfm@41.4.2 from lock file

2025-12-06T10:29:48.51644253Z npm error Missing: @ckeditor/ckeditor5-mention@41.4.2 from lock file

2025-12-06T10:29:48.51644418Z npm error Missing: @ckeditor/ckeditor5-minimap@41.4.2 from lock file

2025-12-06T10:29:48.51644582Z npm error Missing: @ckeditor/ckeditor5-page-break@41.4.2 from lock file

2025-12-06T10:29:48.51644816Z npm error Missing: @ckeditor/ckeditor5-remove-format@41.4.2 from lock file

2025-12-06T10:29:48.51645109Z npm error Missing: @ckeditor/ckeditor5-restricted-editing@41.4.2 from lock file

2025-12-06T10:29:48.51645418Z npm error Missing: @ckeditor/ckeditor5-select-all@41.4.2 from lock file

2025-12-06T10:29:48.51645677Z npm error Missing: @ckeditor/ckeditor5-show-blocks@41.4.2 from lock file

2025-12-06T10:29:48.51645953Z npm error Missing: @ckeditor/ckeditor5-source-editing@41.4.2 from lock file

2025-12-06T10:29:48.516462Z npm error Missing: @ckeditor/ckeditor5-special-characters@41.4.2 from lock file

2025-12-06T10:29:48.51646451Z npm error Missing: @ckeditor/ckeditor5-style@41.4.2 from lock file

2025-12-06T10:29:48.5164671Z npm error Missing: @ckeditor/ckeditor5-theme-lark@41.4.2 from lock file

2025-12-06T10:29:48.51646949Z npm error Missing: @ckeditor/ckeditor5-undo@41.4.2 from lock file

2025-12-06T10:29:48.51647215Z npm error Missing: @ckeditor/ckeditor5-upload@41.4.2 from lock file

2025-12-06T10:29:48.516475Z npm error Missing: @ckeditor/ckeditor5-watchdog@41.4.2 from lock file

2025-12-06T10:29:48.51647758Z npm error Missing: @ckeditor/ckeditor5-widget@41.4.2 from lock file

2025-12-06T10:29:48.51647933Z npm error Missing: @ckeditor/ckeditor5-word-count@41.4.2 from lock file

2025-12-06T10:29:48.51648102Z npm error Missing: ckeditor5@41.4.2 from lock file

2025-12-06T10:29:48.51648269Z npm error Missing: @ckeditor/ckeditor5-autosave@41.4.2 from lock file

2025-12-06T10:29:48.5164844Z npm error Missing: @ckeditor/ckeditor5-clipboard@41.4.2 from lock file

2025-12-06T10:29:48.516486411Z npm error Missing: @ckeditor/ckeditor5-code-block@41.4.2 from lock file

2025-12-06T10:29:48.516488091Z npm error Missing: @ckeditor/ckeditor5-editor-balloon@41.4.2 from lock file

2025-12-06T10:29:48.51648978Z npm error Missing: @ckeditor/ckeditor5-editor-inline@41.4.2 from lock file

2025-12-06T10:29:48.51649154Z npm error Missing: @ckeditor/ckeditor5-editor-multi-root@41.4.2 from lock file

2025-12-06T10:29:48.516493271Z npm error Missing: @ckeditor/ckeditor5-enter@41.4.2 from lock file

2025-12-06T10:29:48.516495601Z npm error Missing: @ckeditor/ckeditor5-find-and-replace@41.4.2 from lock file

2025-12-06T10:29:48.516501351Z npm error Missing: @ckeditor/ckeditor5-highlight@41.4.2 from lock file

2025-12-06T10:29:48.516503141Z npm error Missing: @ckeditor/ckeditor5-horizontal-line@41.4.2 from lock file

2025-12-06T10:29:48.516504861Z npm error Missing: @ckeditor/ckeditor5-html-embed@41.4.2 from lock file

2025-12-06T10:29:48.516506591Z npm error Missing: @ckeditor/ckeditor5-html-support@41.4.2 from lock file

2025-12-06T10:29:48.516508301Z npm error Missing: @ckeditor/ckeditor5-language@41.4.2 from lock file

2025-12-06T10:29:48.516510041Z npm error Missing: @ckeditor/ckeditor5-markdown-gfm@41.4.2 from lock file

2025-12-06T10:29:48.516511711Z npm error Missing: @ckeditor/ckeditor5-mention@41.4.2 from lock file

2025-12-06T10:29:48.516513371Z npm error Missing: @ckeditor/ckeditor5-minimap@41.4.2 from lock file

2025-12-06T10:29:48.516515041Z npm error Missing: @ckeditor/ckeditor5-page-break@41.4.2 from lock file

2025-12-06T10:29:48.516516731Z npm error Missing: @ckeditor/ckeditor5-remove-format@41.4.2 from lock file

2025-12-06T10:29:48.516518511Z npm error Missing: @ckeditor/ckeditor5-restricted-editing@41.4.2 from lock file

2025-12-06T10:29:48.516520171Z npm error Missing: @ckeditor/ckeditor5-select-all@41.4.2 from lock file

2025-12-06T10:29:48.516521861Z npm error Missing: @ckeditor/ckeditor5-show-blocks@41.4.2 from lock file

2025-12-06T10:29:48.516523531Z npm error Missing: @ckeditor/ckeditor5-source-editing@41.4.2 from lock file

2025-12-06T10:29:48.516525181Z npm error Missing: @ckeditor/ckeditor5-special-characters@41.4.2 from lock file

2025-12-06T10:29:48.516526911Z npm error Missing: @ckeditor/ckeditor5-style@41.4.2 from lock file

2025-12-06T10:29:48.516528581Z npm error Missing: @ckeditor/ckeditor5-theme-lark@41.4.2 from lock file

2025-12-06T10:29:48.516530251Z npm error Missing: @ckeditor/ckeditor5-undo@41.4.2 from lock file

2025-12-06T10:29:48.516531921Z npm error Missing: @ckeditor/ckeditor5-upload@41.4.2 from lock file

2025-12-06T10:29:48.516534181Z npm error Missing: @ckeditor/ckeditor5-watchdog@41.4.2 from lock file

2025-12-06T10:29:48.516537091Z npm error Missing: @ckeditor/ckeditor5-widget@41.4.2 from lock file

2025-12-06T10:29:48.516540032Z npm error Missing: @ckeditor/ckeditor5-word-count@41.4.2 from lock file

2025-12-06T10:29:48.516542701Z npm error Missing: ckeditor5@41.4.2 from lock file

2025-12-06T10:29:48.516545452Z npm error Missing: @ckeditor/ckeditor5-alignment@41.4.2 from lock file

2025-12-06T10:29:48.516548041Z npm error Missing: @ckeditor/ckeditor5-autosave@41.4.2 from lock file

2025-12-06T10:29:48.516550732Z npm error Missing: @ckeditor/ckeditor5-clipboard@41.4.2 from lock file

2025-12-06T10:29:48.516553422Z npm error Missing: @ckeditor/ckeditor5-code-block@41.4.2 from lock file

2025-12-06T10:29:48.516555902Z npm error Missing: @ckeditor/ckeditor5-editor-balloon@41.4.2 from lock file

2025-12-06T10:29:48.516558632Z npm error Missing: @ckeditor/ckeditor5-editor-decoupled@41.4.2 from lock file

2025-12-06T10:29:48.516561642Z npm error Missing: @ckeditor/ckeditor5-editor-multi-root@41.4.2 from lock file

2025-12-06T10:29:48.516568472Z npm error Missing: @ckeditor/ckeditor5-enter@41.4.2 from lock file

2025-12-06T10:29:48.516570992Z npm error Missing: @ckeditor/ckeditor5-find-and-replace@41.4.2 from lock file

2025-12-06T10:29:48.516572662Z npm error Missing: @ckeditor/ckeditor5-font@41.4.2 from lock file

2025-12-06T10:29:48.516574312Z npm error Missing: @ckeditor/ckeditor5-highlight@41.4.2 from lock file

2025-12-06T10:29:48.516575982Z npm error Missing: @ckeditor/ckeditor5-horizontal-line@41.4.2 from lock file

2025-12-06T10:29:48.516577672Z npm error Missing: @ckeditor/ckeditor5-html-embed@41.4.2 from lock file

2025-12-06T10:29:48.516579352Z npm error Missing: @ckeditor/ckeditor5-html-support@41.4.2 from lock file

2025-12-06T10:29:48.516585262Z npm error Missing: @ckeditor/ckeditor5-language@41.4.2 from lock file

2025-12-06T10:29:48.516587032Z npm error Missing: @ckeditor/ckeditor5-markdown-gfm@41.4.2 from lock file

2025-12-06T10:29:48.516588762Z npm error Missing: @ckeditor/ckeditor5-mention@41.4.2 from lock file

2025-12-06T10:29:48.516590402Z npm error Missing: @ckeditor/ckeditor5-minimap@41.4.2 from lock file

2025-12-06T10:29:48.516592052Z npm error Missing: @ckeditor/ckeditor5-page-break@41.4.2 from lock file

2025-12-06T10:29:48.516593713Z npm error Missing: @ckeditor/ckeditor5-remove-format@41.4.2 from lock file

2025-12-06T10:29:48.516595382Z npm error Missing: @ckeditor/ckeditor5-restricted-editing@41.4.2 from lock file

2025-12-06T10:29:48.516597022Z npm error Missing: @ckeditor/ckeditor5-select-all@41.4.2 from lock file

2025-12-06T10:29:48.516598702Z npm error Missing: @ckeditor/ckeditor5-show-blocks@41.4.2 from lock file

2025-12-06T10:29:48.516600402Z npm error Missing: @ckeditor/ckeditor5-source-editing@41.4.2 from lock file

2025-12-06T10:29:48.516602073Z npm error Missing: @ckeditor/ckeditor5-special-characters@41.4.2 from lock file

2025-12-06T10:29:48.516603743Z npm error Missing: @ckeditor/ckeditor5-style@41.4.2 from lock file

2025-12-06T10:29:48.516605403Z npm error Missing: @ckeditor/ckeditor5-theme-lark@41.4.2 from lock file

2025-12-06T10:29:48.516607073Z npm error Missing: @ckeditor/ckeditor5-undo@41.4.2 from lock file

2025-12-06T10:29:48.516608743Z npm error Missing: @ckeditor/ckeditor5-upload@41.4.2 from lock file

2025-12-06T10:29:48.516610393Z npm error Missing: @ckeditor/ckeditor5-watchdog@41.4.2 from lock file

2025-12-06T10:29:48.516612063Z npm error Missing: @ckeditor/ckeditor5-widget@41.4.2 from lock file

2025-12-06T10:29:48.516613823Z npm error Missing: @ckeditor/ckeditor5-word-count@41.4.2 from lock file

2025-12-06T10:29:48.516615503Z npm error Missing: ckeditor5@41.4.2 from lock file

2025-12-06T10:29:48.516617233Z npm error Missing: @ckeditor/ckeditor5-alignment@41.4.2 from lock file

2025-12-06T10:29:48.516619003Z npm error Missing: @ckeditor/ckeditor5-autosave@41.4.2 from lock file

2025-12-06T10:29:48.516622013Z npm error Missing: @ckeditor/ckeditor5-clipboard@41.4.2 from lock file

2025-12-06T10:29:48.516624833Z npm error Missing: @ckeditor/ckeditor5-code-block@41.4.2 from lock file

2025-12-06T10:29:48.516627533Z npm error Missing: @ckeditor/ckeditor5-editor-balloon@41.4.2 from lock file

2025-12-06T10:29:48.516630223Z npm error Missing: @ckeditor/ckeditor5-editor-decoupled@41.4.2 from lock file

2025-12-06T10:29:48.516632783Z npm error Missing: @ckeditor/ckeditor5-editor-inline@41.4.2 from lock file

2025-12-06T10:29:48.516635413Z npm error Missing: @ckeditor/ckeditor5-enter@41.4.2 from lock file

2025-12-06T10:29:48.516638093Z npm error Missing: @ckeditor/ckeditor5-find-and-replace@41.4.2 from lock file

2025-12-06T10:29:48.516640843Z npm error Missing: @ckeditor/ckeditor5-font@41.4.2 from lock file

2025-12-06T10:29:48.516643343Z npm error Missing: @ckeditor/ckeditor5-highlight@41.4.2 from lock file

2025-12-06T10:29:48.516646023Z npm error Missing: @ckeditor/ckeditor5-horizontal-line@41.4.2 from lock file

2025-12-06T10:29:48.516649134Z npm error Missing: @ckeditor/ckeditor5-html-embed@41.4.2 from lock file

2025-12-06T10:29:48.516651034Z npm error Missing: @ckeditor/ckeditor5-html-support@41.4.2 from lock file

2025-12-06T10:29:48.516652683Z npm error Missing: @ckeditor/ckeditor5-language@41.4.2 from lock file

2025-12-06T10:29:48.516654343Z npm error Missing: @ckeditor/ckeditor5-markdown-gfm@41.4.2 from lock file

2025-12-06T10:29:48.516656003Z npm error Missing: @ckeditor/ckeditor5-mention@41.4.2 from lock file

2025-12-06T10:29:48.516657644Z npm error Missing: @ckeditor/ckeditor5-minimap@41.4.2 from lock file

2025-12-06T10:29:48.516662564Z npm error Missing: @ckeditor/ckeditor5-page-break@41.4.2 from lock file

2025-12-06T10:29:48.516664284Z npm error Missing: @ckeditor/ckeditor5-remove-format@41.4.2 from lock file

2025-12-06T10:29:48.516666584Z npm error Missing: @ckeditor/ckeditor5-restricted-editing@41.4.2 from lock file

2025-12-06T10:29:48.516668324Z npm error Missing: @ckeditor/ckeditor5-select-all@41.4.2 from lock file

2025-12-06T10:29:48.516669984Z npm error Missing: @ckeditor/ckeditor5-show-blocks@41.4.2 from lock file

2025-12-06T10:29:48.516671654Z npm error Missing: @ckeditor/ckeditor5-source-editing@41.4.2 from lock file

2025-12-06T10:29:48.516673294Z npm error Missing: @ckeditor/ckeditor5-special-characters@41.4.2 from lock file

2025-12-06T10:29:48.516674924Z npm error Missing: @ckeditor/ckeditor5-style@41.4.2 from lock file

2025-12-06T10:29:48.516676584Z npm error Missing: @ckeditor/ckeditor5-theme-lark@41.4.2 from lock file

2025-12-06T10:29:48.516678254Z npm error Missing: @ckeditor/ckeditor5-undo@41.4.2 from lock file

2025-12-06T10:29:48.516679914Z npm error Missing: @ckeditor/ckeditor5-upload@41.4.2 from lock file

2025-12-06T10:29:48.516681554Z npm error Missing: @ckeditor/ckeditor5-watchdog@41.4.2 from lock file

2025-12-06T10:29:48.516683214Z npm error Missing: @ckeditor/ckeditor5-widget@41.4.2 from lock file

2025-12-06T10:29:48.516690544Z npm error Missing: @ckeditor/ckeditor5-word-count@41.4.2 from lock file

2025-12-06T10:29:48.516692374Z npm error Missing: @ckeditor/ckeditor5-alignment@41.4.2 from lock file

2025-12-06T10:29:48.516694014Z npm error Missing: @ckeditor/ckeditor5-autosave@41.4.2 from lock file

2025-12-06T10:29:48.516695704Z npm error Missing: @ckeditor/ckeditor5-clipboard@41.4.2 from lock file

2025-12-06T10:29:48.516697354Z npm error Missing: @ckeditor/ckeditor5-code-block@41.4.2 from lock file

2025-12-06T10:29:48.516699004Z npm error Missing: @ckeditor/ckeditor5-editor-balloon@41.4.2 from lock file

2025-12-06T10:29:48.516700664Z npm error Missing: @ckeditor/ckeditor5-editor-decoupled@41.4.2 from lock file

2025-12-06T10:29:48.516702324Z npm error Missing: @ckeditor/ckeditor5-editor-inline@41.4.2 from lock file

2025-12-06T10:29:48.516704035Z npm error Missing: @ckeditor/ckeditor5-editor-multi-root@41.4.2 from lock file

2025-12-06T10:29:48.516706204Z npm error Missing: @ckeditor/ckeditor5-enter@41.4.2 from lock file

2025-12-06T10:29:48.516709104Z npm error Missing: @ckeditor/ckeditor5-find-and-replace@41.4.2 from lock file

2025-12-06T10:29:48.516712165Z npm error Missing: @ckeditor/ckeditor5-font@41.4.2 from lock file

2025-12-06T10:29:48.516714895Z npm error Missing: @ckeditor/ckeditor5-highlight@41.4.2 from lock file

2025-12-06T10:29:48.516717665Z npm error Missing: @ckeditor/ckeditor5-horizontal-line@41.4.2 from lock file

2025-12-06T10:29:48.516720425Z npm error Missing: @ckeditor/ckeditor5-html-embed@41.4.2 from lock file

2025-12-06T10:29:48.516723185Z npm error Missing: @ckeditor/ckeditor5-html-support@41.4.2 from lock file

2025-12-06T10:29:48.516725905Z npm error Missing: @ckeditor/ckeditor5-language@41.4.2 from lock file

2025-12-06T10:29:48.516728365Z npm error Missing: @ckeditor/ckeditor5-markdown-gfm@41.4.2 from lock file

2025-12-06T10:29:48.516730915Z npm error Missing: @ckeditor/ckeditor5-mention@41.4.2 from lock file

2025-12-06T10:29:48.516733715Z npm error Missing: @ckeditor/ckeditor5-minimap@41.4.2 from lock file

2025-12-06T10:29:48.516736265Z npm error Missing: @ckeditor/ckeditor5-page-break@41.4.2 from lock file

2025-12-06T10:29:48.516738015Z npm error Missing: @ckeditor/ckeditor5-remove-format@41.4.2 from lock file

2025-12-06T10:29:48.516739715Z npm error Missing: @ckeditor/ckeditor5-restricted-editing@41.4.2 from lock file

2025-12-06T10:29:48.516744755Z npm error Missing: @ckeditor/ckeditor5-select-all@41.4.2 from lock file

2025-12-06T10:29:48.516747095Z npm error Missing: @ckeditor/ckeditor5-show-blocks@41.4.2 from lock file

2025-12-06T10:29:48.516748815Z npm error Missing: @ckeditor/ckeditor5-source-editing@41.4.2 from lock file

2025-12-06T10:29:48.516750475Z npm error Missing: @ckeditor/ckeditor5-special-characters@41.4.2 from lock file

2025-12-06T10:29:48.516752485Z npm error Missing: @ckeditor/ckeditor5-style@41.4.2 from lock file

2025-12-06T10:29:48.516754145Z npm error Missing: @ckeditor/ckeditor5-theme-lark@41.4.2 from lock file

2025-12-06T10:29:48.516755816Z npm error Missing: @ckeditor/ckeditor5-undo@41.4.2 from lock file

2025-12-06T10:29:48.516757516Z npm error Missing: @ckeditor/ckeditor5-upload@41.4.2 from lock file

2025-12-06T10:29:48.516759176Z npm error Missing: @ckeditor/ckeditor5-watchdog@41.4.2 from lock file

2025-12-06T10:29:48.516760816Z npm error Missing: @ckeditor/ckeditor5-widget@41.4.2 from lock file

2025-12-06T10:29:48.516762476Z npm error Missing: @ckeditor/ckeditor5-word-count@41.4.2 from lock file

2025-12-06T10:29:48.516764166Z npm error Missing: @ckeditor/ckeditor5-alignment@41.4.2 from lock file

2025-12-06T10:29:48.516765916Z npm error Missing: @ckeditor/ckeditor5-autosave@41.4.2 from lock file

2025-12-06T10:29:48.516767576Z npm error Missing: @ckeditor/ckeditor5-clipboard@41.4.2 from lock file

2025-12-06T10:29:48.516769226Z npm error Missing: @ckeditor/ckeditor5-code-block@41.4.2 from lock file

2025-12-06T10:29:48.516770906Z npm error Missing: @ckeditor/ckeditor5-editor-balloon@41.4.2 from lock file

2025-12-06T10:29:48.516772546Z npm error Missing: @ckeditor/ckeditor5-editor-decoupled@41.4.2 from lock file

2025-12-06T10:29:48.516774236Z npm error Missing: @ckeditor/ckeditor5-editor-inline@41.4.2 from lock file

2025-12-06T10:29:48.516775866Z npm error Missing: @ckeditor/ckeditor5-editor-multi-root@41.4.2 from lock file

2025-12-06T10:29:48.516777536Z npm error Missing: @ckeditor/ckeditor5-enter@41.4.2 from lock file

2025-12-06T10:29:48.516779216Z npm error Missing: @ckeditor/ckeditor5-find-and-replace@41.4.2 from lock file

2025-12-06T10:29:48.516780896Z npm error Missing: @ckeditor/ckeditor5-font@41.4.2 from lock file

2025-12-06T10:29:48.516782556Z npm error Missing: @ckeditor/ckeditor5-highlight@41.4.2 from lock file

2025-12-06T10:29:48.516784206Z npm error Missing: @ckeditor/ckeditor5-horizontal-line@41.4.2 from lock file

2025-12-06T10:29:48.516785866Z npm error Missing: @ckeditor/ckeditor5-html-embed@41.4.2 from lock file

2025-12-06T10:29:48.516787526Z npm error Missing: @ckeditor/ckeditor5-html-support@41.4.2 from lock file

2025-12-06T10:29:48.516789226Z npm error Missing: @ckeditor/ckeditor5-language@41.4.2 from lock file

2025-12-06T10:29:48.516790966Z npm error Missing: @ckeditor/ckeditor5-markdown-gfm@41.4.2 from lock file

2025-12-06T10:29:48.516794266Z npm error Missing: @ckeditor/ckeditor5-mention@41.4.2 from lock file

2025-12-06T10:29:48.516797266Z npm error Missing: @ckeditor/ckeditor5-minimap@41.4.2 from lock file

2025-12-06T10:29:48.516799976Z npm error Missing: @ckeditor/ckeditor5-page-break@41.4.2 from lock file

2025-12-06T10:29:48.516802856Z npm error Missing: @ckeditor/ckeditor5-remove-format@41.4.2 from lock file

2025-12-06T10:29:48.516805436Z npm error Missing: @ckeditor/ckeditor5-restricted-editing@41.4.2 from lock file

2025-12-06T10:29:48.516823067Z npm error Missing: @ckeditor/ckeditor5-select-all@41.4.2 from lock file

2025-12-06T10:29:48.516825217Z npm error Missing: @ckeditor/ckeditor5-show-blocks@41.4.2 from lock file

2025-12-06T10:29:48.516827887Z npm error Missing: @ckeditor/ckeditor5-source-editing@41.4.2 from lock file

2025-12-06T10:29:48.516829627Z npm error Missing: @ckeditor/ckeditor5-special-characters@41.4.2 from lock file

2025-12-06T10:29:48.516835467Z npm error Missing: @ckeditor/ckeditor5-style@41.4.2 from lock file

2025-12-06T10:29:48.516837227Z npm error Missing: @ckeditor/ckeditor5-theme-lark@41.4.2 from lock file

2025-12-06T10:29:48.516854867Z npm error Missing: @ckeditor/ckeditor5-undo@41.4.2 from lock file

2025-12-06T10:29:48.516862918Z npm error Missing: @ckeditor/ckeditor5-upload@41.4.2 from lock file

2025-12-06T10:29:48.516865738Z npm error Missing: @ckeditor/ckeditor5-watchdog@41.4.2 from lock file

2025-12-06T10:29:48.516868747Z npm error Missing: @ckeditor/ckeditor5-widget@41.4.2 from lock file

2025-12-06T10:29:48.516871438Z npm error Missing: @ckeditor/ckeditor5-word-count@41.4.2 from lock file

2025-12-06T10:29:48.516873808Z npm error Missing: color-convert@3.1.0 from lock file

2025-12-06T10:29:48.516877868Z npm error Missing: color-parse@2.0.2 from lock file

2025-12-06T10:29:48.516880648Z npm error Missing: color-name@2.1.0 from lock file

2025-12-06T10:29:48.516882358Z npm error Missing: @ckeditor/ckeditor5-alignment@41.4.2 from lock file

2025-12-06T10:29:48.516884048Z npm error Missing: @ckeditor/ckeditor5-autosave@41.4.2 from lock file

2025-12-06T10:29:48.516885708Z npm error Missing: @ckeditor/ckeditor5-clipboard@41.4.2 from lock file

2025-12-06T10:29:48.516887388Z npm error Missing: @ckeditor/ckeditor5-code-block@41.4.2 from lock file

2025-12-06T10:29:48.516889028Z npm error Missing: @ckeditor/ckeditor5-editor-balloon@41.4.2 from lock file

2025-12-06T10:29:48.516890678Z npm error Missing: @ckeditor/ckeditor5-editor-decoupled@41.4.2 from lock file

2025-12-06T10:29:48.516892338Z npm error Missing: @ckeditor/ckeditor5-editor-inline@41.4.2 from lock file

2025-12-06T10:29:48.516893998Z npm error Missing: @ckeditor/ckeditor5-editor-multi-root@41.4.2 from lock file

2025-12-06T10:29:48.516895648Z npm error Missing: @ckeditor/ckeditor5-enter@41.4.2 from lock file

2025-12-06T10:29:48.516897298Z npm error Missing: @ckeditor/ckeditor5-find-and-replace@41.4.2 from lock file

2025-12-06T10:29:48.516898948Z npm error Missing: @ckeditor/ckeditor5-font@41.4.2 from lock file

2025-12-06T10:29:48.516900608Z npm error Missing: @ckeditor/ckeditor5-highlight@41.4.2 from lock file

2025-12-06T10:29:48.516902268Z npm error Missing: @ckeditor/ckeditor5-horizontal-line@41.4.2 from lock file

2025-12-06T10:29:48.516903928Z npm error Missing: @ckeditor/ckeditor5-html-embed@41.4.2 from lock file

2025-12-06T10:29:48.516905598Z npm error Missing: @ckeditor/ckeditor5-html-support@41.4.2 from lock file

2025-12-06T10:29:48.516907258Z npm error Missing: @ckeditor/ckeditor5-language@41.4.2 from lock file

2025-12-06T10:29:48.516908908Z npm error Missing: @ckeditor/ckeditor5-markdown-gfm@41.4.2 from lock file

2025-12-06T10:29:48.516910568Z npm error Missing: @ckeditor/ckeditor5-mention@41.4.2 from lock file

2025-12-06T10:29:48.516912218Z npm error Missing: @ckeditor/ckeditor5-minimap@41.4.2 from lock file

2025-12-06T10:29:48.516913878Z npm error Missing: @ckeditor/ckeditor5-page-break@41.4.2 from lock file

2025-12-06T10:29:48.516915539Z npm error Missing: @ckeditor/ckeditor5-remove-format@41.4.2 from lock file

2025-12-06T10:29:48.516918208Z npm error Missing: @ckeditor/ckeditor5-restricted-editing@41.4.2 from lock file

2025-12-06T10:29:48.516919919Z npm error Missing: @ckeditor/ckeditor5-select-all@41.4.2 from lock file

2025-12-06T10:29:48.516921559Z npm error Missing: @ckeditor/ckeditor5-show-blocks@41.4.2 from lock file

2025-12-06T10:29:48.516923239Z npm error Missing: @ckeditor/ckeditor5-source-editing@41.4.2 from lock file

2025-12-06T10:29:48.516924888Z npm error Missing: @ckeditor/ckeditor5-special-characters@41.4.2 from lock file

2025-12-06T10:29:48.516930669Z npm error Missing: @ckeditor/ckeditor5-style@41.4.2 from lock file

2025-12-06T10:29:48.516932639Z npm error Missing: @ckeditor/ckeditor5-theme-lark@41.4.2 from lock file

2025-12-06T10:29:48.516934359Z npm error Missing: @ckeditor/ckeditor5-undo@41.4.2 from lock file

2025-12-06T10:29:48.516936429Z npm error Missing: @ckeditor/ckeditor5-upload@41.4.2 from lock file

2025-12-06T10:29:48.516939219Z npm error Missing: @ckeditor/ckeditor5-watchdog@41.4.2 from lock file

2025-12-06T10:29:48.516942109Z npm error Missing: @ckeditor/ckeditor5-widget@41.4.2 from lock file

2025-12-06T10:29:48.516944639Z npm error Missing: @ckeditor/ckeditor5-word-count@41.4.2 from lock file

2025-12-06T10:29:48.516947659Z npm error Missing: color-convert@3.1.0 from lock file

2025-12-06T10:29:48.516950339Z npm error Missing: color-parse@2.0.2 from lock file

2025-12-06T10:29:48.516953149Z npm error Missing: color-name@2.1.0 from lock file

2025-12-06T10:29:48.516955939Z npm error Missing: @ckeditor/ckeditor5-alignment@41.4.2 from lock file

2025-12-06T10:29:48.516958219Z npm error Missing: @ckeditor/ckeditor5-autosave@41.4.2 from lock file

2025-12-06T10:29:48.516960729Z npm error Missing: @ckeditor/ckeditor5-clipboard@41.4.2 from lock file

2025-12-06T10:29:48.516963339Z npm error Missing: @ckeditor/ckeditor5-code-block@41.4.2 from lock file

2025-12-06T10:29:48.516965999Z npm error Missing: @ckeditor/ckeditor5-editor-balloon@41.4.2 from lock file

2025-12-06T10:29:48.51696888Z npm error Missing: @ckeditor/ckeditor5-editor-decoupled@41.4.2 from lock file

2025-12-06T10:29:48.51697098Z npm error Missing: @ckeditor/ckeditor5-editor-inline@41.4.2 from lock file

2025-12-06T10:29:48.516972689Z npm error Missing: @ckeditor/ckeditor5-editor-multi-root@41.4.2 from lock file

2025-12-06T10:29:48.51697434Z npm error Missing: @ckeditor/ckeditor5-enter@41.4.2 from lock file

2025-12-06T10:29:48.516975989Z npm error Missing: @ckeditor/ckeditor5-find-and-replace@41.4.2 from lock file

2025-12-06T10:29:48.51698512Z npm error Missing: @ckeditor/ckeditor5-font@41.4.2 from lock file

2025-12-06T10:29:48.51698697Z npm error Missing: @ckeditor/ckeditor5-highlight@41.4.2 from lock file

2025-12-06T10:29:48.51698861Z npm error Missing: @ckeditor/ckeditor5-horizontal-line@41.4.2 from lock file

2025-12-06T10:29:48.51699025Z npm error Missing: @ckeditor/ckeditor5-html-embed@41.4.2 from lock file

2025-12-06T10:29:48.51699198Z npm error Missing: @ckeditor/ckeditor5-html-support@41.4.2 from lock file

2025-12-06T10:29:48.51699361Z npm error Missing: @ckeditor/ckeditor5-language@41.4.2 from lock file

2025-12-06T10:29:48.51699526Z npm error Missing: @ckeditor/ckeditor5-markdown-gfm@41.4.2 from lock file

2025-12-06T10:29:48.51699689Z npm error Missing: @ckeditor/ckeditor5-mention@41.4.2 from lock file

2025-12-06T10:29:48.51699852Z npm error Missing: @ckeditor/ckeditor5-minimap@41.4.2 from lock file

2025-12-06T10:29:48.51700103Z npm error Missing: @ckeditor/ckeditor5-page-break@41.4.2 from lock file

2025-12-06T10:29:48.51700279Z npm error Missing: @ckeditor/ckeditor5-remove-format@41.4.2 from lock file

2025-12-06T10:29:48.5170045Z npm error Missing: @ckeditor/ckeditor5-restricted-editing@41.4.2 from lock file

2025-12-06T10:29:48.51700618Z npm error Missing: @ckeditor/ckeditor5-select-all@41.4.2 from lock file

2025-12-06T10:29:48.51700782Z npm error Missing: @ckeditor/ckeditor5-show-blocks@41.4.2 from lock file

2025-12-06T10:29:48.51700948Z npm error Missing: @ckeditor/ckeditor5-source-editing@41.4.2 from lock file

2025-12-06T10:29:48.51701112Z npm error Missing: @ckeditor/ckeditor5-special-characters@41.4.2 from lock file

2025-12-06T10:29:48.51701278Z npm error Missing: @ckeditor/ckeditor5-style@41.4.2 from lock file

2025-12-06T10:29:48.51701446Z npm error Missing: @ckeditor/ckeditor5-theme-lark@41.4.2 from lock file

2025-12-06T10:29:48.51702021Z npm error Missing: @ckeditor/ckeditor5-undo@41.4.2 from lock file

2025-12-06T10:29:48.51702193Z npm error Missing: @ckeditor/ckeditor5-upload@41.4.2 from lock file

2025-12-06T10:29:48.517024481Z npm error Missing: @ckeditor/ckeditor5-watchdog@41.4.2 from lock file

2025-12-06T10:29:48.517027421Z npm error Missing: @ckeditor/ckeditor5-widget@41.4.2 from lock file

2025-12-06T10:29:48.517030361Z npm error Missing: @ckeditor/ckeditor5-word-count@41.4.2 from lock file

2025-12-06T10:29:48.517033121Z npm error Missing: color-convert@3.1.0 from lock file

2025-12-06T10:29:48.517036081Z npm error Missing: color-parse@2.0.2 from lock file

2025-12-06T10:29:48.517038771Z npm error Missing: color-name@2.1.0 from lock file

2025-12-06T10:29:48.517041431Z npm error Missing: @ckeditor/ckeditor5-alignment@41.4.2 from lock file

2025-12-06T10:29:48.517043941Z npm error Missing: @ckeditor/ckeditor5-autosave@41.4.2 from lock file

2025-12-06T10:29:48.517046501Z npm error Missing: @ckeditor/ckeditor5-clipboard@41.4.2 from lock file

2025-12-06T10:29:48.517049101Z npm error Missing: @ckeditor/ckeditor5-code-block@41.4.2 from lock file

2025-12-06T10:29:48.517051741Z npm error Missing: @ckeditor/ckeditor5-editor-balloon@41.4.2 from lock file

2025-12-06T10:29:48.517054321Z npm error Missing: @ckeditor/ckeditor5-editor-decoupled@41.4.2 from lock file

2025-12-06T10:29:48.517056071Z npm error Missing: @ckeditor/ckeditor5-editor-inline@41.4.2 from lock file

2025-12-06T10:29:48.517057901Z npm error Missing: @ckeditor/ckeditor5-editor-multi-root@41.4.2 from lock file

2025-12-06T10:29:48.517059611Z npm error Missing: @ckeditor/ckeditor5-enter@41.4.2 from lock file

2025-12-06T10:29:48.517061311Z npm error Missing: @ckeditor/ckeditor5-find-and-replace@41.4.2 from lock file

2025-12-06T10:29:48.517062991Z npm error Missing: @ckeditor/ckeditor5-font@41.4.2 from lock file

2025-12-06T10:29:48.517064771Z npm error Missing: @ckeditor/ckeditor5-highlight@41.4.2 from lock file

2025-12-06T10:29:48.517066471Z npm error Missing: @ckeditor/ckeditor5-horizontal-line@41.4.2 from lock file

2025-12-06T10:29:48.517068201Z npm error Missing: @ckeditor/ckeditor5-html-embed@41.4.2 from lock file

2025-12-06T10:29:48.517069831Z npm error Missing: @ckeditor/ckeditor5-html-support@41.4.2 from lock file

2025-12-06T10:29:48.517071481Z npm error Missing: @ckeditor/ckeditor5-language@41.4.2 from lock file

2025-12-06T10:29:48.517073181Z npm error Missing: @ckeditor/ckeditor5-markdown-gfm@41.4.2 from lock file

2025-12-06T10:29:48.517074841Z npm error Missing: @ckeditor/ckeditor5-mention@41.4.2 from lock file

2025-12-06T10:29:48.517076521Z npm error Missing: @ckeditor/ckeditor5-minimap@41.4.2 from lock file

2025-12-06T10:29:48.517079002Z npm error Missing: @ckeditor/ckeditor5-page-break@41.4.2 from lock file

2025-12-06T10:29:48.517080691Z npm error Missing: @ckeditor/ckeditor5-remove-format@41.4.2 from lock file

2025-12-06T10:29:48.517082351Z npm error Missing: @ckeditor/ckeditor5-restricted-editing@41.4.2 from lock file

2025-12-06T10:29:48.517084002Z npm error Missing: @ckeditor/ckeditor5-select-all@41.4.2 from lock file

2025-12-06T10:29:48.517085631Z npm error Missing: @ckeditor/ckeditor5-show-blocks@41.4.2 from lock file

2025-12-06T10:29:48.517087272Z npm error Missing: @ckeditor/ckeditor5-source-editing@41.4.2 from lock file

2025-12-06T10:29:48.517088912Z npm error Missing: @ckeditor/ckeditor5-special-characters@41.4.2 from lock file

2025-12-06T10:29:48.517090632Z npm error Missing: @ckeditor/ckeditor5-style@41.4.2 from lock file

2025-12-06T10:29:48.517092342Z npm error Missing: @ckeditor/ckeditor5-theme-lark@41.4.2 from lock file

2025-12-06T10:29:48.517094002Z npm error Missing: @ckeditor/ckeditor5-undo@41.4.2 from lock file

2025-12-06T10:29:48.517101142Z npm error Missing: @ckeditor/ckeditor5-upload@41.4.2 from lock file

2025-12-06T10:29:48.517102862Z npm error Missing: @ckeditor/ckeditor5-watchdog@41.4.2 from lock file

2025-12-06T10:29:48.517109862Z npm error Missing: @ckeditor/ckeditor5-widget@41.4.2 from lock file

2025-12-06T10:29:48.517113182Z npm error Missing: @ckeditor/ckeditor5-word-count@41.4.2 from lock file

2025-12-06T10:29:48.517116112Z npm error Missing: color-convert@3.1.0 from lock file

2025-12-06T10:29:48.517118652Z npm error Missing: color-parse@2.0.2 from lock file

2025-12-06T10:29:48.517121522Z npm error Missing: color-name@2.1.0 from lock file

2025-12-06T10:29:48.517124002Z npm error Missing: color-convert@3.1.0 from lock file

2025-12-06T10:29:48.517126782Z npm error Missing: color-parse@2.0.2 from lock file

2025-12-06T10:29:48.517129552Z npm error Missing: color-name@2.1.0 from lock file

2025-12-06T10:29:48.517132123Z npm error Missing: color-convert@3.1.0 from lock file

2025-12-06T10:29:48.517134643Z npm error Missing: color-parse@2.0.2 from lock file

2025-12-06T10:29:48.517137343Z npm error Missing: color-name@2.1.0 from lock file

2025-12-06T10:29:48.517141303Z npm error Missing: @ckeditor/ckeditor5-engine@47.3.0 from lock file

2025-12-06T10:29:48.517143163Z npm error Missing: color-convert@3.1.0 from lock file

2025-12-06T10:29:48.517144803Z npm error Missing: color-parse@2.0.2 from lock file

2025-12-06T10:29:48.517146443Z npm error Missing: color-name@2.1.0 from lock file

2025-12-06T10:29:48.517148093Z npm error Missing: @ckeditor/ckeditor5-ui@47.3.0 from lock file

2025-12-06T10:29:48.517149723Z npm error Missing: color-convert@3.1.0 from lock file

2025-12-06T10:29:48.517151453Z npm error Missing: color-parse@2.0.2 from lock file

2025-12-06T10:29:48.517153123Z npm error Missing: color-name@2.1.0 from lock file

2025-12-06T10:29:48.517154843Z npm error Missing: @ckeditor/ckeditor5-alignment@41.4.2 from lock file

2025-12-06T10:29:48.517156533Z npm error Missing: @ckeditor/ckeditor5-autosave@41.4.2 from lock file

2025-12-06T10:29:48.517158243Z npm error Missing: @ckeditor/ckeditor5-clipboard@41.4.2 from lock file

2025-12-06T10:29:48.517159893Z npm error Missing: @ckeditor/ckeditor5-code-block@41.4.2 from lock file

2025-12-06T10:29:48.517161523Z npm error Missing: @ckeditor/ckeditor5-editor-balloon@41.4.2 from lock file

2025-12-06T10:29:48.517163163Z npm error Missing: @ckeditor/ckeditor5-editor-decoupled@41.4.2 from lock file

2025-12-06T10:29:48.517164803Z npm error Missing: @ckeditor/ckeditor5-editor-inline@41.4.2 from lock file

2025-12-06T10:29:48.517166473Z npm error Missing: @ckeditor/ckeditor5-editor-multi-root@41.4.2 from lock file

2025-12-06T10:29:48.517168103Z npm error Missing: @ckeditor/ckeditor5-enter@41.4.2 from lock file

2025-12-06T10:29:48.517169743Z npm error Missing: @ckeditor/ckeditor5-find-and-replace@41.4.2 from lock file

2025-12-06T10:29:48.517171383Z npm error Missing: @ckeditor/ckeditor5-font@41.4.2 from lock file

2025-12-06T10:29:48.517173023Z npm error Missing: @ckeditor/ckeditor5-highlight@41.4.2 from lock file

2025-12-06T10:29:48.517174663Z npm error Missing: @ckeditor/ckeditor5-horizontal-line@41.4.2 from lock file

2025-12-06T10:29:48.517176423Z npm error Missing: @ckeditor/ckeditor5-html-embed@41.4.2 from lock file

2025-12-06T10:29:48.517178163Z npm error Missing: @ckeditor/ckeditor5-html-support@41.4.2 from lock file

2025-12-06T10:29:48.517179903Z npm error Missing: @ckeditor/ckeditor5-language@41.4.2 from lock file

2025-12-06T10:29:48.517181553Z npm error Missing: @ckeditor/ckeditor5-markdown-gfm@41.4.2 from lock file

2025-12-06T10:29:48.517183193Z npm error Missing: @ckeditor/ckeditor5-mention@41.4.2 from lock file

2025-12-06T10:29:48.517188264Z npm error Missing: @ckeditor/ckeditor5-minimap@41.4.2 from lock file

2025-12-06T10:29:48.517189953Z npm error Missing: @ckeditor/ckeditor5-page-break@41.4.2 from lock file

2025-12-06T10:29:48.517191604Z npm error Missing: @ckeditor/ckeditor5-remove-format@41.4.2 from lock file

2025-12-06T10:29:48.517193253Z npm error Missing: @ckeditor/ckeditor5-restricted-editing@41.4.2 from lock file

2025-12-06T10:29:48.517194964Z npm error Missing: @ckeditor/ckeditor5-select-all@41.4.2 from lock file

2025-12-06T10:29:48.517196994Z npm error Missing: @ckeditor/ckeditor5-show-blocks@41.4.2 from lock file

2025-12-06T10:29:48.517199704Z npm error Missing: @ckeditor/ckeditor5-source-editing@41.4.2 from lock file

2025-12-06T10:29:48.517202754Z npm error Missing: @ckeditor/ckeditor5-special-characters@41.4.2 from lock file

2025-12-06T10:29:48.517205474Z npm error Missing: @ckeditor/ckeditor5-style@41.4.2 from lock file

2025-12-06T10:29:48.517208904Z npm error Missing: @ckeditor/ckeditor5-theme-lark@41.4.2 from lock file

2025-12-06T10:29:48.517211674Z npm error Missing: @ckeditor/ckeditor5-undo@41.4.2 from lock file

2025-12-06T10:29:48.517214244Z npm error Missing: @ckeditor/ckeditor5-upload@41.4.2 from lock file

2025-12-06T10:29:48.517216984Z npm error Missing: @ckeditor/ckeditor5-watchdog@41.4.2 from lock file

2025-12-06T10:29:48.517219614Z npm error Missing: @ckeditor/ckeditor5-widget@41.4.2 from lock file

2025-12-06T10:29:48.517222114Z npm error Missing: @ckeditor/ckeditor5-word-count@41.4.2 from lock file

2025-12-06T10:29:48.517224874Z npm error Missing: @ckeditor/ckeditor5-engine@47.3.0 from lock file

2025-12-06T10:29:48.517227414Z npm error Missing: color-convert@3.1.0 from lock file

2025-12-06T10:29:48.517229114Z npm error Missing: color-parse@2.0.2 from lock file

2025-12-06T10:29:48.517230834Z npm error Missing: color-name@2.1.0 from lock file

2025-12-06T10:29:48.517232514Z npm error Missing: color-convert@3.1.0 from lock file

2025-12-06T10:29:48.517234184Z npm error Missing: color-parse@2.0.2 from lock file

2025-12-06T10:29:48.517235894Z npm error Missing: color-name@2.1.0 from lock file

2025-12-06T10:29:48.517237544Z npm error Missing: @ckeditor/ckeditor5-engine@47.3.0 from lock file

2025-12-06T10:29:48.517239305Z npm error Missing: color-convert@3.1.0 from lock file

2025-12-06T10:29:48.517240985Z npm error Missing: color-parse@2.0.2 from lock file

2025-12-06T10:29:48.517242665Z npm error Missing: color-name@2.1.0 from lock file

2025-12-06T10:29:48.517250285Z npm error Missing: @ckeditor/ckeditor5-alignment@41.4.2 from lock file

2025-12-06T10:29:48.517252675Z npm error Missing: @ckeditor/ckeditor5-autosave@41.4.2 from lock file

2025-12-06T10:29:48.517254425Z npm error Missing: @ckeditor/ckeditor5-clipboard@41.4.2 from lock file

2025-12-06T10:29:48.517256135Z npm error Missing: @ckeditor/ckeditor5-code-block@41.4.2 from lock file

2025-12-06T10:29:48.517257835Z npm error Missing: @ckeditor/ckeditor5-editor-balloon@41.4.2 from lock file

2025-12-06T10:29:48.517259475Z npm error Missing: @ckeditor/ckeditor5-editor-decoupled@41.4.2 from lock file

2025-12-06T10:29:48.517261115Z npm error Missing: @ckeditor/ckeditor5-editor-inline@41.4.2 from lock file

2025-12-06T10:29:48.517262765Z npm error Missing: @ckeditor/ckeditor5-editor-multi-root@41.4.2 from lock file

2025-12-06T10:29:48.517264405Z npm error Missing: @ckeditor/ckeditor5-enter@41.4.2 from lock file

2025-12-06T10:29:48.517266045Z npm error Missing: @ckeditor/ckeditor5-find-and-replace@41.4.2 from lock file

2025-12-06T10:29:48.517267705Z npm error Missing: @ckeditor/ckeditor5-font@41.4.2 from lock file

2025-12-06T10:29:48.517269335Z npm error Missing: @ckeditor/ckeditor5-highlight@41.4.2 from lock file

2025-12-06T10:29:48.517274515Z npm error Missing: @ckeditor/ckeditor5-horizontal-line@41.4.2 from lock file

2025-12-06T10:29:48.517276825Z npm error Missing: @ckeditor/ckeditor5-html-embed@41.4.2 from lock file

2025-12-06T10:29:48.517278485Z npm error Missing: @ckeditor/ckeditor5-html-support@41.4.2 from lock file

2025-12-06T10:29:48.517280135Z npm error Missing: @ckeditor/ckeditor5-language@41.4.2 from lock file

2025-12-06T10:29:48.517281795Z npm error Missing: @ckeditor/ckeditor5-markdown-gfm@41.4.2 from lock file

2025-12-06T10:29:48.517283435Z npm error Missing: @ckeditor/ckeditor5-mention@41.4.2 from lock file

2025-12-06T10:29:48.517286245Z npm error Missing: @ckeditor/ckeditor5-minimap@41.4.2 from lock file

2025-12-06T10:29:48.517289155Z npm error Missing: @ckeditor/ckeditor5-page-break@41.4.2 from lock file

2025-12-06T10:29:48.517291885Z npm error Missing: @ckeditor/ckeditor5-remove-format@41.4.2 from lock file

2025-12-06T10:29:48.517294635Z npm error Missing: @ckeditor/ckeditor5-restricted-editing@41.4.2 from lock file

2025-12-06T10:29:48.517297366Z npm error Missing: @ckeditor/ckeditor5-select-all@41.4.2 from lock file

2025-12-06T10:29:48.517299926Z npm error Missing: @ckeditor/ckeditor5-show-blocks@41.4.2 from lock file

2025-12-06T10:29:48.517302686Z npm error Missing: @ckeditor/ckeditor5-source-editing@41.4.2 from lock file

2025-12-06T10:29:48.517305316Z npm error Missing: @ckeditor/ckeditor5-special-characters@41.4.2 from lock file

2025-12-06T10:29:48.517307856Z npm error Missing: @ckeditor/ckeditor5-style@41.4.2 from lock file

2025-12-06T10:29:48.517310386Z npm error Missing: @ckeditor/ckeditor5-theme-lark@41.4.2 from lock file

2025-12-06T10:29:48.517313306Z npm error Missing: @ckeditor/ckeditor5-undo@41.4.2 from lock file

2025-12-06T10:29:48.517315596Z npm error Missing: @ckeditor/ckeditor5-upload@41.4.2 from lock file

2025-12-06T10:29:48.517317246Z npm error Missing: @ckeditor/ckeditor5-watchdog@41.4.2 from lock file

2025-12-06T10:29:48.517318906Z npm error Missing: @ckeditor/ckeditor5-widget@41.4.2 from lock file

2025-12-06T10:29:48.517320556Z npm error Missing: @ckeditor/ckeditor5-word-count@41.4.2 from lock file

2025-12-06T10:29:48.517322196Z npm error Missing: @ckeditor/ckeditor5-engine@47.3.0 from lock file

2025-12-06T10:29:48.517323886Z npm error Missing: color-convert@3.1.0 from lock file

2025-12-06T10:29:48.517325556Z npm error Missing: color-parse@2.0.2 from lock file

2025-12-06T10:29:48.517327216Z npm error Missing: color-name@2.1.0 from lock file

2025-12-06T10:29:48.517328946Z npm error Missing: @ckeditor/ckeditor5-engine@47.3.0 from lock file

2025-12-06T10:29:48.517330666Z npm error Missing: color-convert@3.1.0 from lock file

2025-12-06T10:29:48.517332356Z npm error Missing: color-parse@2.0.2 from lock file

2025-12-06T10:29:48.517334026Z npm error Missing: color-name@2.1.0 from lock file

2025-12-06T10:29:48.517335696Z npm error Missing: @ckeditor/ckeditor5-engine@47.3.0 from lock file

2025-12-06T10:29:48.517337396Z npm error Missing: color-convert@3.1.0 from lock file

2025-12-06T10:29:48.517339066Z npm error Missing: color-parse@2.0.2 from lock file

2025-12-06T10:29:48.517340726Z npm error Missing: color-name@2.1.0 from lock file

2025-12-06T10:29:48.517342386Z npm error Missing: @ckeditor/ckeditor5-ui@47.3.0 from lock file

2025-12-06T10:29:48.517344066Z npm error Missing: @ckeditor/ckeditor5-paragraph@47.3.0 from lock file

2025-12-06T10:29:48.517345746Z npm error Missing: @ckeditor/ckeditor5-typing@47.3.0 from lock file

2025-12-06T10:29:48.517347407Z npm error Missing: color-convert@3.1.0 from lock file

2025-12-06T10:29:48.517349067Z npm error Missing: color-parse@2.0.2 from lock file

2025-12-06T10:29:48.517350716Z npm error Missing: color-name@2.1.0 from lock file

2025-12-06T10:29:48.517355327Z npm error Missing: @ckeditor/ckeditor5-alignment@41.4.2 from lock file

2025-12-06T10:29:48.517357027Z npm error Missing: @ckeditor/ckeditor5-autosave@41.4.2 from lock file

2025-12-06T10:29:48.517358687Z npm error Missing: @ckeditor/ckeditor5-clipboard@41.4.2 from lock file

2025-12-06T10:29:48.517360367Z npm error Missing: @ckeditor/ckeditor5-code-block@41.4.2 from lock file

2025-12-06T10:29:48.517361997Z npm error Missing: @ckeditor/ckeditor5-editor-balloon@41.4.2 from lock file

2025-12-06T10:29:48.517363637Z npm error Missing: @ckeditor/ckeditor5-editor-decoupled@41.4.2 from lock file

2025-12-06T10:29:48.517365267Z npm error Missing: @ckeditor/ckeditor5-editor-inline@41.4.2 from lock file

2025-12-06T10:29:48.517366927Z npm error Missing: @ckeditor/ckeditor5-editor-multi-root@41.4.2 from lock file

2025-12-06T10:29:48.517368587Z npm error Missing: @ckeditor/ckeditor5-enter@41.4.2 from lock file

2025-12-06T10:29:48.517377147Z npm error Missing: @ckeditor/ckeditor5-find-and-replace@41.4.2 from lock file

2025-12-06T10:29:48.517379897Z npm error Missing: @ckeditor/ckeditor5-font@41.4.2 from lock file

2025-12-06T10:29:48.517382817Z npm error Missing: @ckeditor/ckeditor5-highlight@41.4.2 from lock file

2025-12-06T10:29:48.517385547Z npm error Missing: @ckeditor/ckeditor5-horizontal-line@41.4.2 from lock file

2025-12-06T10:29:48.517388167Z npm error Missing: @ckeditor/ckeditor5-html-embed@41.4.2 from lock file

2025-12-06T10:29:48.517390917Z npm error Missing: @ckeditor/ckeditor5-html-support@41.4.2 from lock file

2025-12-06T10:29:48.517393587Z npm error Missing: @ckeditor/ckeditor5-language@41.4.2 from lock file

2025-12-06T10:29:48.517396087Z npm error Missing: @ckeditor/ckeditor5-markdown-gfm@41.4.2 from lock file

2025-12-06T10:29:48.517398897Z npm error Missing: @ckeditor/ckeditor5-mention@41.4.2 from lock file

2025-12-06T10:29:48.517401997Z npm error Missing: @ckeditor/ckeditor5-minimap@41.4.2 from lock file

2025-12-06T10:29:48.517403908Z npm error Missing: @ckeditor/ckeditor5-page-break@41.4.2 from lock file

2025-12-06T10:29:48.517405637Z npm error Missing: @ckeditor/ckeditor5-remove-format@41.4.2 from lock file

2025-12-06T10:29:48.517407317Z npm error Missing: @ckeditor/ckeditor5-restricted-editing@41.4.2 from lock file

2025-12-06T10:29:48.517409008Z npm error Missing: @ckeditor/ckeditor5-select-all@41.4.2 from lock file

2025-12-06T10:29:48.517410677Z npm error Missing: @ckeditor/ckeditor5-show-blocks@41.4.2 from lock file

2025-12-06T10:29:48.517412348Z npm error Missing: @ckeditor/ckeditor5-source-editing@41.4.2 from lock file

2025-12-06T10:29:48.517413988Z npm error Missing: @ckeditor/ckeditor5-special-characters@41.4.2 from lock file

2025-12-06T10:29:48.517415658Z npm error Missing: @ckeditor/ckeditor5-style@41.4.2 from lock file

2025-12-06T10:29:48.517417338Z npm error Missing: @ckeditor/ckeditor5-theme-lark@41.4.2 from lock file

2025-12-06T10:29:48.517418998Z npm error Missing: @ckeditor/ckeditor5-undo@41.4.2 from lock file

2025-12-06T10:29:48.517420648Z npm error Missing: @ckeditor/ckeditor5-upload@41.4.2 from lock file

2025-12-06T10:29:48.517422338Z npm error Missing: @ckeditor/ckeditor5-watchdog@41.4.2 from lock file

2025-12-06T10:29:48.517423988Z npm error Missing: @ckeditor/ckeditor5-widget@41.4.2 from lock file

2025-12-06T10:29:48.517425648Z npm error Missing: @ckeditor/ckeditor5-word-count@41.4.2 from lock file

2025-12-06T10:29:48.517427288Z npm error Missing: @ckeditor/ckeditor5-alignment@41.4.2 from lock file

2025-12-06T10:29:48.517428948Z npm error Missing: @ckeditor/ckeditor5-autosave@41.4.2 from lock file

2025-12-06T10:29:48.517430578Z npm error Missing: @ckeditor/ckeditor5-clipboard@41.4.2 from lock file

2025-12-06T10:29:48.517435518Z npm error Missing: @ckeditor/ckeditor5-code-block@41.4.2 from lock file

2025-12-06T10:29:48.517437228Z npm error Missing: @ckeditor/ckeditor5-editor-balloon@41.4.2 from lock file

2025-12-06T10:29:48.517438908Z npm error Missing: @ckeditor/ckeditor5-editor-decoupled@41.4.2 from lock file

2025-12-06T10:29:48.517440548Z npm error Missing: @ckeditor/ckeditor5-editor-inline@41.4.2 from lock file

2025-12-06T10:29:48.517442178Z npm error Missing: @ckeditor/ckeditor5-editor-multi-root@41.4.2 from lock file

2025-12-06T10:29:48.517443828Z npm error Missing: @ckeditor/ckeditor5-enter@41.4.2 from lock file

2025-12-06T10:29:48.517445478Z npm error Missing: @ckeditor/ckeditor5-find-and-replace@41.4.2 from lock file

2025-12-06T10:29:48.517447138Z npm error Missing: @ckeditor/ckeditor5-font@41.4.2 from lock file

2025-12-06T10:29:48.517448808Z npm error Missing: @ckeditor/ckeditor5-highlight@41.4.2 from lock file

2025-12-06T10:29:48.517450468Z npm error Missing: @ckeditor/ckeditor5-horizontal-line@41.4.2 from lock file

2025-12-06T10:29:48.517452138Z npm error Missing: @ckeditor/ckeditor5-html-embed@41.4.2 from lock file

2025-12-06T10:29:48.517453808Z npm error Missing: @ckeditor/ckeditor5-html-support@41.4.2 from lock file

2025-12-06T10:29:48.517455468Z npm error Missing: @ckeditor/ckeditor5-language@41.4.2 from lock file

2025-12-06T10:29:48.517457209Z npm error Missing: @ckeditor/ckeditor5-markdown-gfm@41.4.2 from lock file

2025-12-06T10:29:48.517459498Z npm error Missing: @ckeditor/ckeditor5-mention@41.4.2 from lock file

2025-12-06T10:29:48.517462498Z npm error Missing: @ckeditor/ckeditor5-minimap@41.4.2 from lock file

2025-12-06T10:29:48.517466309Z npm error Missing: @ckeditor/ckeditor5-page-break@41.4.2 from lock file

2025-12-06T10:29:48.517469369Z npm error Missing: @ckeditor/ckeditor5-remove-format@41.4.2 from lock file

2025-12-06T10:29:48.517472109Z npm error Missing: @ckeditor/ckeditor5-restricted-editing@41.4.2 from lock file

2025-12-06T10:29:48.517474699Z npm error Missing: @ckeditor/ckeditor5-select-all@41.4.2 from lock file

2025-12-06T10:29:48.517477299Z npm error Missing: @ckeditor/ckeditor5-show-blocks@41.4.2 from lock file

2025-12-06T10:29:48.517479699Z npm error Missing: @ckeditor/ckeditor5-source-editing@41.4.2 from lock file

2025-12-06T10:29:48.517482079Z npm error Missing: @ckeditor/ckeditor5-special-characters@41.4.2 from lock file

2025-12-06T10:29:48.517484949Z npm error Missing: @ckeditor/ckeditor5-style@41.4.2 from lock file

2025-12-06T10:29:48.517487709Z npm error Missing: @ckeditor/ckeditor5-theme-lark@41.4.2 from lock file

2025-12-06T10:29:48.517489439Z npm error Missing: @ckeditor/ckeditor5-undo@41.4.2 from lock file

2025-12-06T10:29:48.517491129Z npm error Missing: @ckeditor/ckeditor5-upload@41.4.2 from lock file

2025-12-06T10:29:48.517492769Z npm error Missing: @ckeditor/ckeditor5-watchdog@41.4.2 from lock file

2025-12-06T10:29:48.517494419Z npm error Missing: @ckeditor/ckeditor5-widget@41.4.2 from lock file

2025-12-06T10:29:48.517501109Z npm error Missing: @ckeditor/ckeditor5-word-count@41.4.2 from lock file

2025-12-06T10:29:48.517502899Z npm error Missing: @ckeditor/ckeditor5-engine@47.3.0 from lock file

2025-12-06T10:29:48.517504549Z npm error Missing: color-convert@3.1.0 from lock file

2025-12-06T10:29:48.517506209Z npm error Missing: color-parse@2.0.2 from lock file

2025-12-06T10:29:48.517507959Z npm error Missing: color-name@2.1.0 from lock file

2025-12-06T10:29:48.517509599Z npm error Missing: @ckeditor/ckeditor5-alignment@41.4.2 from lock file

2025-12-06T10:29:48.517511819Z npm error Missing: @ckeditor/ckeditor5-autosave@41.4.2 from lock file

2025-12-06T10:29:48.51751349Z npm error Missing: @ckeditor/ckeditor5-clipboard@41.4.2 from lock file

2025-12-06T10:29:48.517518479Z npm error Missing: @ckeditor/ckeditor5-code-block@41.4.2 from lock file

2025-12-06T10:29:48.51752025Z npm error Missing: @ckeditor/ckeditor5-editor-balloon@41.4.2 from lock file

2025-12-06T10:29:48.51752205Z npm error Missing: @ckeditor/ckeditor5-editor-decoupled@41.4.2 from lock file

2025-12-06T10:29:48.51752378Z npm error Missing: @ckeditor/ckeditor5-editor-inline@41.4.2 from lock file

2025-12-06T10:29:48.51752548Z npm error Missing: @ckeditor/ckeditor5-editor-multi-root@41.4.2 from lock file

2025-12-06T10:29:48.51752714Z npm error Missing: @ckeditor/ckeditor5-enter@41.4.2 from lock file

2025-12-06T10:29:48.51752878Z npm error Missing: @ckeditor/ckeditor5-find-and-replace@41.4.2 from lock file

2025-12-06T10:29:48.51753045Z npm error Missing: @ckeditor/ckeditor5-font@41.4.2 from lock file

2025-12-06T10:29:48.51753212Z npm error Missing: @ckeditor/ckeditor5-highlight@41.4.2 from lock file

2025-12-06T10:29:48.51753384Z npm error Missing: @ckeditor/ckeditor5-horizontal-line@41.4.2 from lock file

2025-12-06T10:29:48.51753628Z npm error Missing: @ckeditor/ckeditor5-html-embed@41.4.2 from lock file

2025-12-06T10:29:48.51753797Z npm error Missing: @ckeditor/ckeditor5-html-support@41.4.2 from lock file

2025-12-06T10:29:48.51753972Z npm error Missing: @ckeditor/ckeditor5-language@41.4.2 from lock file

2025-12-06T10:29:48.51754143Z npm error Missing: @ckeditor/ckeditor5-markdown-gfm@41.4.2 from lock file

2025-12-06T10:29:48.51754338Z npm error Missing: @ckeditor/ckeditor5-mention@41.4.2 from lock file

2025-12-06T10:29:48.5175459Z npm error Missing: @ckeditor/ckeditor5-minimap@41.4.2 from lock file

2025-12-06T10:29:48.51754886Z npm error Missing: @ckeditor/ckeditor5-page-break@41.4.2 from lock file

2025-12-06T10:29:48.51755181Z npm error Missing: @ckeditor/ckeditor5-remove-format@41.4.2 from lock file

2025-12-06T10:29:48.51755533Z npm error Missing: @ckeditor/ckeditor5-restricted-editing@41.4.2 from lock file

2025-12-06T10:29:48.51755823Z npm error Missing: @ckeditor/ckeditor5-select-all@41.4.2 from lock file

2025-12-06T10:29:48.51756081Z npm error Missing: @ckeditor/ckeditor5-show-blocks@41.4.2 from lock file

2025-12-06T10:29:48.51756342Z npm error Missing: @ckeditor/ckeditor5-source-editing@41.4.2 from lock file

2025-12-06T10:29:48.517566171Z npm error Missing: @ckeditor/ckeditor5-special-characters@41.4.2 from lock file

2025-12-06T10:29:48.51756872Z npm error Missing: @ckeditor/ckeditor5-style@41.4.2 from lock file

2025-12-06T10:29:48.517571411Z npm error Missing: @ckeditor/ckeditor5-theme-lark@41.4.2 from lock file

2025-12-06T10:29:48.517574521Z npm error Missing: @ckeditor/ckeditor5-undo@41.4.2 from lock file

2025-12-06T10:29:48.517576261Z npm error Missing: @ckeditor/ckeditor5-upload@41.4.2 from lock file

2025-12-06T10:29:48.517577931Z npm error Missing: @ckeditor/ckeditor5-watchdog@41.4.2 from lock file

2025-12-06T10:29:48.517579621Z npm error Missing: @ckeditor/ckeditor5-widget@41.4.2 from lock file

2025-12-06T10:29:48.517581371Z npm error Missing: @ckeditor/ckeditor5-word-count@41.4.2 from lock file

2025-12-06T10:29:48.517583111Z npm error Missing: @ckeditor/ckeditor5-alignment@41.4.2 from lock file

2025-12-06T10:29:48.517584761Z npm error Missing: @ckeditor/ckeditor5-autosave@41.4.2 from lock file

2025-12-06T10:29:48.517586401Z npm error Missing: @ckeditor/ckeditor5-clipboard@41.4.2 from lock file

2025-12-06T10:29:48.517588061Z npm error Missing: @ckeditor/ckeditor5-code-block@41.4.2 from lock file

2025-12-06T10:29:48.517589721Z npm error Missing: @ckeditor/ckeditor5-editor-balloon@41.4.2 from lock file

2025-12-06T10:29:48.517591371Z npm error Missing: @ckeditor/ckeditor5-editor-decoupled@41.4.2 from lock file

2025-12-06T10:29:48.517593021Z npm error Missing: @ckeditor/ckeditor5-editor-inline@41.4.2 from lock file

2025-12-06T10:29:48.517598511Z npm error Missing: @ckeditor/ckeditor5-editor-multi-root@41.4.2 from lock file

2025-12-06T10:29:48.517600211Z npm error Missing: @ckeditor/ckeditor5-enter@41.4.2 from lock file

2025-12-06T10:29:48.517601861Z npm error Missing: @ckeditor/ckeditor5-find-and-replace@41.4.2 from lock file

2025-12-06T10:29:48.517603511Z npm error Missing: @ckeditor/ckeditor5-font@41.4.2 from lock file

2025-12-06T10:29:48.517605181Z npm error Missing: @ckeditor/ckeditor5-highlight@41.4.2 from lock file

2025-12-06T10:29:48.517606841Z npm error Missing: @ckeditor/ckeditor5-horizontal-line@41.4.2 from lock file

2025-12-06T10:29:48.517608501Z npm error Missing: @ckeditor/ckeditor5-html-embed@41.4.2 from lock file

2025-12-06T10:29:48.517610191Z npm error Missing: @ckeditor/ckeditor5-html-support@41.4.2 from lock file

2025-12-06T10:29:48.517612031Z npm error Missing: @ckeditor/ckeditor5-language@41.4.2 from lock file

2025-12-06T10:29:48.517613751Z npm error Missing: @ckeditor/ckeditor5-markdown-gfm@41.4.2 from lock file

2025-12-06T10:29:48.517615381Z npm error Missing: @ckeditor/ckeditor5-mention@41.4.2 from lock file

2025-12-06T10:29:48.517618032Z npm error Missing: @ckeditor/ckeditor5-minimap@41.4.2 from lock file

2025-12-06T10:29:48.517624752Z npm error Missing: @ckeditor/ckeditor5-page-break@41.4.2 from lock file

2025-12-06T10:29:48.517627261Z npm error Missing: @ckeditor/ckeditor5-remove-format@41.4.2 from lock file

2025-12-06T10:29:48.517628952Z npm error Missing: @ckeditor/ckeditor5-restricted-editing@41.4.2 from lock file

2025-12-06T10:29:48.517630692Z npm error Missing: @ckeditor/ckeditor5-select-all@41.4.2 from lock file

2025-12-06T10:29:48.517633422Z npm error Missing: @ckeditor/ckeditor5-show-blocks@41.4.2 from lock file

2025-12-06T10:29:48.517636452Z npm error Missing: @ckeditor/ckeditor5-source-editing@41.4.2 from lock file

2025-12-06T10:29:48.517639082Z npm error Missing: @ckeditor/ckeditor5-special-characters@41.4.2 from lock file

2025-12-06T10:29:48.517641762Z npm error Missing: @ckeditor/ckeditor5-style@41.4.2 from lock file

2025-12-06T10:29:48.517644412Z npm error Missing: @ckeditor/ckeditor5-theme-lark@41.4.2 from lock file

2025-12-06T10:29:48.517646882Z npm error Missing: @ckeditor/ckeditor5-undo@41.4.2 from lock file

2025-12-06T10:29:48.517649762Z npm error Missing: @ckeditor/ckeditor5-upload@41.4.2 from lock file

2025-12-06T10:29:48.517653362Z npm error Missing: @ckeditor/ckeditor5-watchdog@41.4.2 from lock file

2025-12-06T10:29:48.517656042Z npm error Missing: @ckeditor/ckeditor5-widget@41.4.2 from lock file

2025-12-06T10:29:48.517658802Z npm error Missing: @ckeditor/ckeditor5-word-count@41.4.2 from lock file

2025-12-06T10:29:48.517661462Z npm error Missing: @ckeditor/ckeditor5-ui@47.3.0 from lock file

2025-12-06T10:29:48.517663142Z npm error Missing: @ckeditor/ckeditor5-utils@47.3.0 from lock file

2025-12-06T10:29:48.517664882Z npm error Missing: color-convert@3.1.0 from lock file

2025-12-06T10:29:48.517666562Z npm error Missing: color-parse@2.0.2 from lock file

2025-12-06T10:29:48.517668262Z npm error Missing: color-name@2.1.0 from lock file

2025-12-06T10:29:48.517669922Z npm error Missing: @ckeditor/ckeditor5-alignment@41.4.2 from lock file

2025-12-06T10:29:48.517671562Z npm error Missing: @ckeditor/ckeditor5-autosave@41.4.2 from lock file

2025-12-06T10:29:48.517673222Z npm error Missing: @ckeditor/ckeditor5-clipboard@41.4.2 from lock file

2025-12-06T10:29:48.517674942Z npm error Missing: @ckeditor/ckeditor5-code-block@41.4.2 from lock file

2025-12-06T10:29:48.517676602Z npm error Missing: @ckeditor/ckeditor5-editor-balloon@41.4.2 from lock file

2025-12-06T10:29:48.517678613Z npm error Missing: @ckeditor/ckeditor5-editor-decoupled@41.4.2 from lock file

2025-12-06T10:29:48.517683913Z npm error Missing: @ckeditor/ckeditor5-editor-inline@41.4.2 from lock file

2025-12-06T10:29:48.517685633Z npm error Missing: @ckeditor/ckeditor5-editor-multi-root@41.4.2 from lock file

2025-12-06T10:29:48.517687313Z npm error Missing: @ckeditor/ckeditor5-enter@41.4.2 from lock file

2025-12-06T10:29:48.517688983Z npm error Missing: @ckeditor/ckeditor5-find-and-replace@41.4.2 from lock file

2025-12-06T10:29:48.517690713Z npm error Missing: @ckeditor/ckeditor5-font@41.4.2 from lock file

2025-12-06T10:29:48.517692423Z npm error Missing: @ckeditor/ckeditor5-highlight@41.4.2 from lock file

2025-12-06T10:29:48.517694323Z npm error Missing: @ckeditor/ckeditor5-horizontal-line@41.4.2 from lock file

2025-12-06T10:29:48.517695963Z npm error Missing: @ckeditor/ckeditor5-html-embed@41.4.2 from lock file

2025-12-06T10:29:48.517697633Z npm error Missing: @ckeditor/ckeditor5-html-support@41.4.2 from lock file

2025-12-06T10:29:48.517699303Z npm error Missing: @ckeditor/ckeditor5-language@41.4.2 from lock file

2025-12-06T10:29:48.517700933Z npm error Missing: @ckeditor/ckeditor5-markdown-gfm@41.4.2 from lock file

2025-12-06T10:29:48.517702633Z npm error Missing: @ckeditor/ckeditor5-mention@41.4.2 from lock file

2025-12-06T10:29:48.517704303Z npm error Missing: @ckeditor/ckeditor5-minimap@41.4.2 from lock file

2025-12-06T10:29:48.517705953Z npm error Missing: @ckeditor/ckeditor5-page-break@41.4.2 from lock file

2025-12-06T10:29:48.517707583Z npm error Missing: @ckeditor/ckeditor5-remove-format@41.4.2 from lock file

2025-12-06T10:29:48.517709233Z npm error Missing: @ckeditor/ckeditor5-restricted-editing@41.4.2 from lock file

2025-12-06T10:29:48.517710873Z npm error Missing: @ckeditor/ckeditor5-select-all@41.4.2 from lock file

2025-12-06T10:29:48.517712563Z npm error Missing: @ckeditor/ckeditor5-show-blocks@41.4.2 from lock file

2025-12-06T10:29:48.517714203Z npm error Missing: @ckeditor/ckeditor5-source-editing@41.4.2 from lock file

2025-12-06T10:29:48.517715833Z npm error Missing: @ckeditor/ckeditor5-special-characters@41.4.2 from lock file

2025-12-06T10:29:48.517717783Z npm error Missing: @ckeditor/ckeditor5-style@41.4.2 from lock file

2025-12-06T10:29:48.517720303Z npm error Missing: @ckeditor/ckeditor5-theme-lark@41.4.2 from lock file

2025-12-06T10:29:48.517723263Z npm error Missing: @ckeditor/ckeditor5-undo@41.4.2 from lock file

2025-12-06T10:29:48.517725874Z npm error Missing: @ckeditor/ckeditor5-upload@41.4.2 from lock file

2025-12-06T10:29:48.517728703Z npm error Missing: @ckeditor/ckeditor5-watchdog@41.4.2 from lock file

2025-12-06T10:29:48.517731223Z npm error Missing: @ckeditor/ckeditor5-widget@41.4.2 from lock file

2025-12-06T10:29:48.517733974Z npm error Missing: @ckeditor/ckeditor5-word-count@41.4.2 from lock file

2025-12-06T10:29:48.517736564Z npm error Missing: @ckeditor/ckeditor5-engine@47.3.0 from lock file

2025-12-06T10:29:48.517739124Z npm error Missing: color-convert@3.1.0 from lock file

2025-12-06T10:29:48.517741594Z npm error Missing: color-parse@2.0.2 from lock file

2025-12-06T10:29:48.517744984Z npm error Missing: color-name@2.1.0 from lock file

2025-12-06T10:29:48.517747544Z npm error Missing: color-convert@3.1.0 from lock file

2025-12-06T10:29:48.517749224Z npm error Missing: color-parse@2.0.2 from lock file

2025-12-06T10:29:48.517750894Z npm error Missing: color-name@2.1.0 from lock file

2025-12-06T10:29:48.517757944Z npm error Missing: @ckeditor/ckeditor5-engine@47.3.0 from lock file

2025-12-06T10:29:48.517760614Z npm error Missing: color-convert@3.1.0 from lock file

2025-12-06T10:29:48.517762274Z npm error Missing: color-parse@2.0.2 from lock file

2025-12-06T10:29:48.517763944Z npm error Missing: color-name@2.1.0 from lock file

2025-12-06T10:29:48.517768784Z npm error Missing: @ckeditor/ckeditor5-alignment@41.4.2 from lock file

2025-12-06T10:29:48.517770544Z npm error Missing: @ckeditor/ckeditor5-autosave@41.4.2 from lock file

2025-12-06T10:29:48.517772224Z npm error Missing: @ckeditor/ckeditor5-clipboard@41.4.2 from lock file

2025-12-06T10:29:48.517773864Z npm error Missing: @ckeditor/ckeditor5-code-block@41.4.2 from lock file

2025-12-06T10:29:48.517775604Z npm error Missing: @ckeditor/ckeditor5-editor-balloon@41.4.2 from lock file

2025-12-06T10:29:48.517777334Z npm error Missing: @ckeditor/ckeditor5-editor-decoupled@41.4.2 from lock file

2025-12-06T10:29:48.517778984Z npm error Missing: @ckeditor/ckeditor5-editor-inline@41.4.2 from lock file

2025-12-06T10:29:48.517780644Z npm error Missing: @ckeditor/ckeditor5-editor-multi-root@41.4.2 from lock file

2025-12-06T10:29:48.517782315Z npm error Missing: @ckeditor/ckeditor5-enter@41.4.2 from lock file

2025-12-06T10:29:48.517783995Z npm error Missing: @ckeditor/ckeditor5-find-and-replace@41.4.2 from lock file

2025-12-06T10:29:48.517785675Z npm error Missing: @ckeditor/ckeditor5-font@41.4.2 from lock file

2025-12-06T10:29:48.517787324Z npm error Missing: @ckeditor/ckeditor5-highlight@41.4.2 from lock file

2025-12-06T10:29:48.517788995Z npm error Missing: @ckeditor/ckeditor5-horizontal-line@41.4.2 from lock file

2025-12-06T10:29:48.517791965Z npm error Missing: @ckeditor/ckeditor5-html-embed@41.4.2 from lock file

2025-12-06T10:29:48.517793775Z npm error Missing: @ckeditor/ckeditor5-html-support@41.4.2 from lock file

2025-12-06T10:29:48.517795435Z npm error Missing: @ckeditor/ckeditor5-language@41.4.2 from lock file

2025-12-06T10:29:48.517797075Z npm error Missing: @ckeditor/ckeditor5-markdown-gfm@41.4.2 from lock file

2025-12-06T10:29:48.517798745Z npm error Missing: @ckeditor/ckeditor5-mention@41.4.2 from lock file

2025-12-06T10:29:48.517800435Z npm error Missing: @ckeditor/ckeditor5-minimap@41.4.2 from lock file

2025-12-06T10:29:48.517802075Z npm error Missing: @ckeditor/ckeditor5-page-break@41.4.2 from lock file

2025-12-06T10:29:48.517804035Z npm error Missing: @ckeditor/ckeditor5-remove-format@41.4.2 from lock file

2025-12-06T10:29:48.517806655Z npm error Missing: @ckeditor/ckeditor5-restricted-editing@41.4.2 from lock file

2025-12-06T10:29:48.517809745Z npm error Missing: @ckeditor/ckeditor5-select-all@41.4.2 from lock file

2025-12-06T10:29:48.517812425Z npm error Missing: @ckeditor/ckeditor5-show-blocks@41.4.2 from lock file

2025-12-06T10:29:48.517815085Z npm error Missing: @ckeditor/ckeditor5-source-editing@41.4.2 from lock file

2025-12-06T10:29:48.517817705Z npm error Missing: @ckeditor/ckeditor5-special-characters@41.4.2 from lock file

2025-12-06T10:29:48.517820355Z npm error Missing: @ckeditor/ckeditor5-style@41.4.2 from lock file

2025-12-06T10:29:48.517822965Z npm error Missing: @ckeditor/ckeditor5-theme-lark@41.4.2 from lock file

2025-12-06T10:29:48.517825435Z npm error Missing: @ckeditor/ckeditor5-undo@41.4.2 from lock file

2025-12-06T10:29:48.517828315Z npm error Missing: @ckeditor/ckeditor5-upload@41.4.2 from lock file

2025-12-06T10:29:48.517831315Z npm error Missing: @ckeditor/ckeditor5-watchdog@41.4.2 from lock file

2025-12-06T10:29:48.517833035Z npm error Missing: @ckeditor/ckeditor5-widget@41.4.2 from lock file

2025-12-06T10:29:48.517834696Z npm error Missing: @ckeditor/ckeditor5-word-count@41.4.2 from lock file

2025-12-06T10:29:48.517836336Z npm error Missing: @ckeditor/ckeditor5-engine@47.3.0 from lock file

2025-12-06T10:29:48.517838005Z npm error Missing: color-convert@3.1.0 from lock file

2025-12-06T10:29:48.517866126Z npm error Missing: color-parse@2.0.2 from lock file

2025-12-06T10:29:48.517869396Z npm error Missing: color-name@2.1.0 from lock file

2025-12-06T10:29:48.517877596Z npm error Missing: color-convert@3.1.0 from lock file

2025-12-06T10:29:48.517880596Z npm error Missing: color-parse@2.0.2 from lock file

2025-12-06T10:29:48.517883606Z npm error Missing: color-name@2.1.0 from lock file

2025-12-06T10:29:48.517885356Z npm error Missing: color-convert@3.1.0 from lock file

2025-12-06T10:29:48.517887076Z npm error Missing: color-parse@2.0.2 from lock file

2025-12-06T10:29:48.517888806Z npm error Missing: color-name@2.1.0 from lock file

2025-12-06T10:29:48.517890546Z npm error Missing: @ckeditor/ckeditor5-engine@47.3.0 from lock file

2025-12-06T10:29:48.517892237Z npm error Missing: color-convert@3.1.0 from lock file

2025-12-06T10:29:48.517893886Z npm error Missing: color-parse@2.0.2 from lock file

2025-12-06T10:29:48.517895577Z npm error Missing: color-name@2.1.0 from lock file

2025-12-06T10:29:48.517897286Z npm error Missing: @ckeditor/ckeditor5-engine@47.3.0 from lock file

2025-12-06T10:29:48.517899007Z npm error Missing: color-convert@3.1.0 from lock file

2025-12-06T10:29:48.517900667Z npm error Missing: color-parse@2.0.2 from lock file

2025-12-06T10:29:48.517902367Z npm error Missing: color-name@2.1.0 from lock file

2025-12-06T10:29:48.517904087Z npm error Missing: @ckeditor/ckeditor5-engine@47.3.0 from lock file

2025-12-06T10:29:48.517905937Z npm error Missing: color-convert@3.1.0 from lock file

2025-12-06T10:29:48.517907637Z npm error Missing: color-parse@2.0.2 from lock file

2025-12-06T10:29:48.517909287Z npm error Missing: color-name@2.1.0 from lock file

2025-12-06T10:29:48.517911037Z npm error Missing: @ckeditor/ckeditor5-engine@47.3.0 from lock file

2025-12-06T10:29:48.517912717Z npm error Missing: color-convert@3.1.0 from lock file

2025-12-06T10:29:48.517914377Z npm error Missing: color-parse@2.0.2 from lock file

2025-12-06T10:29:48.517916137Z npm error Missing: color-name@2.1.0 from lock file

2025-12-06T10:29:48.517928347Z npm error Missing: @ckeditor/ckeditor5-alignment@41.4.2 from lock file

2025-12-06T10:29:48.517930197Z npm error Missing: @ckeditor/ckeditor5-autosave@41.4.2 from lock file

2025-12-06T10:29:48.517931857Z npm error Missing: @ckeditor/ckeditor5-clipboard@41.4.2 from lock file

2025-12-06T10:29:48.517933497Z npm error Missing: @ckeditor/ckeditor5-code-block@41.4.2 from lock file

2025-12-06T10:29:48.517940477Z npm error Missing: @ckeditor/ckeditor5-editor-balloon@41.4.2 from lock file

2025-12-06T10:29:48.517943747Z npm error Missing: @ckeditor/ckeditor5-editor-decoupled@41.4.2 from lock file

2025-12-06T10:29:48.517946838Z npm error Missing: @ckeditor/ckeditor5-editor-inline@41.4.2 from lock file

2025-12-06T10:29:48.517949427Z npm error Missing: @ckeditor/ckeditor5-editor-multi-root@41.4.2 from lock file

2025-12-06T10:29:48.517952238Z npm error Missing: @ckeditor/ckeditor5-enter@41.4.2 from lock file

2025-12-06T10:29:48.517954758Z npm error Missing: @ckeditor/ckeditor5-find-and-replace@41.4.2 from lock file

2025-12-06T10:29:48.517957608Z npm error Missing: @ckeditor/ckeditor5-font@41.4.2 from lock file

2025-12-06T10:29:48.517960368Z npm error Missing: @ckeditor/ckeditor5-highlight@41.4.2 from lock file

2025-12-06T10:29:48.517963058Z npm error Missing: @ckeditor/ckeditor5-horizontal-line@41.4.2 from lock file

2025-12-06T10:29:48.517965728Z npm error Missing: @ckeditor/ckeditor5-html-embed@41.4.2 from lock file

2025-12-06T10:29:48.517968468Z npm error Missing: @ckeditor/ckeditor5-html-support@41.4.2 from lock file

2025-12-06T10:29:48.517970888Z npm error Missing: @ckeditor/ckeditor5-language@41.4.2 from lock file

2025-12-06T10:29:48.517972568Z npm error Missing: @ckeditor/ckeditor5-markdown-gfm@41.4.2 from lock file

2025-12-06T10:29:48.517974208Z npm error Missing: @ckeditor/ckeditor5-mention@41.4.2 from lock file

2025-12-06T10:29:48.517979558Z npm error Missing: @ckeditor/ckeditor5-minimap@41.4.2 from lock file

2025-12-06T10:29:48.517981328Z npm error Missing: @ckeditor/ckeditor5-page-break@41.4.2 from lock file

2025-12-06T10:29:48.517983058Z npm error Missing: @ckeditor/ckeditor5-remove-format@41.4.2 from lock file

2025-12-06T10:29:48.517984788Z npm error Missing: @ckeditor/ckeditor5-restricted-editing@41.4.2 from lock file

2025-12-06T10:29:48.517986448Z npm error Missing: @ckeditor/ckeditor5-select-all@41.4.2 from lock file

2025-12-06T10:29:48.517988148Z npm error Missing: @ckeditor/ckeditor5-show-blocks@41.4.2 from lock file

2025-12-06T10:29:48.517989958Z npm error Missing: @ckeditor/ckeditor5-source-editing@41.4.2 from lock file

2025-12-06T10:29:48.517991648Z npm error Missing: @ckeditor/ckeditor5-special-characters@41.4.2 from lock file

2025-12-06T10:29:48.517993388Z npm error Missing: @ckeditor/ckeditor5-style@41.4.2 from lock file

2025-12-06T10:29:48.517995108Z npm error Missing: @ckeditor/ckeditor5-theme-lark@41.4.2 from lock file

2025-12-06T10:29:48.517996779Z npm error Missing: @ckeditor/ckeditor5-undo@41.4.2 from lock file

2025-12-06T10:29:48.517998479Z npm error Missing: @ckeditor/ckeditor5-upload@41.4.2 from lock file

2025-12-06T10:29:48.518000148Z npm error Missing: @ckeditor/ckeditor5-watchdog@41.4.2 from lock file

2025-12-06T10:29:48.518001819Z npm error Missing: @ckeditor/ckeditor5-widget@41.4.2 from lock file

2025-12-06T10:29:48.518003479Z npm error Missing: @ckeditor/ckeditor5-word-count@41.4.2 from lock file

2025-12-06T10:29:48.518005119Z npm error Missing: @ckeditor/ckeditor5-core@47.3.0 from lock file

2025-12-06T10:29:48.518006799Z npm error Missing: @ckeditor/ckeditor5-engine@47.3.0 from lock file

2025-12-06T10:29:48.518008439Z npm error Missing: @ckeditor/ckeditor5-utils@47.3.0 from lock file

2025-12-06T10:29:48.518010129Z npm error Missing: color-convert@3.1.0 from lock file

2025-12-06T10:29:48.518012669Z npm error Missing: color-parse@2.0.2 from lock file

2025-12-06T10:29:48.518014379Z npm error Missing: color-name@2.1.0 from lock file

2025-12-06T10:29:48.518016099Z npm error Missing: color-convert@3.1.0 from lock file

2025-12-06T10:29:48.518017769Z npm error Missing: color-parse@2.0.2 from lock file

2025-12-06T10:29:48.518019449Z npm error Missing: color-name@2.1.0 from lock file

2025-12-06T10:29:48.518021099Z npm error Missing: @ckeditor/ckeditor5-engine@47.3.0 from lock file

2025-12-06T10:29:48.518022759Z npm error Missing: @ckeditor/ckeditor5-ui@47.3.0 from lock file

2025-12-06T10:29:48.518024429Z npm error Missing: color-convert@3.1.0 from lock file

2025-12-06T10:29:48.518026089Z npm error Missing: color-parse@2.0.2 from lock file

2025-12-06T10:29:48.518028729Z npm error Missing: color-name@2.1.0 from lock file

2025-12-06T10:29:48.518031529Z npm error Missing: @ckeditor/ckeditor5-ui@47.3.0 from lock file

2025-12-06T10:29:48.518034339Z npm error Missing: color-convert@3.1.0 from lock file

2025-12-06T10:29:48.518037219Z npm error Missing: color-parse@2.0.2 from lock file

2025-12-06T10:29:48.518039869Z npm error Missing: color-name@2.1.0 from lock file

2025-12-06T10:29:48.518042379Z npm error Missing: color-convert@3.1.0 from lock file

2025-12-06T10:29:48.518045149Z npm error Missing: color-parse@2.0.2 from lock file

2025-12-06T10:29:48.518047859Z npm error Missing: color-name@2.1.0 from lock file

2025-12-06T10:29:48.518050209Z npm error Missing: @ckeditor/ckeditor5-engine@47.3.0 from lock file

2025-12-06T10:29:48.51805256Z npm error Missing: color-convert@3.1.0 from lock file

2025-12-06T10:29:48.518055309Z npm error Missing: color-parse@2.0.2 from lock file

2025-12-06T10:29:48.518058209Z npm error Missing: color-name@2.1.0 from lock file

2025-12-06T10:29:48.51806408Z npm error Missing: color-convert@3.1.0 from lock file

2025-12-06T10:29:48.51806584Z npm error Missing: color-parse@2.0.2 from lock file

2025-12-06T10:29:48.5180675Z npm error Missing: color-name@2.1.0 from lock file

2025-12-06T10:29:48.51806925Z npm error

2025-12-06T10:29:48.51807103Z npm error Clean install a project

2025-12-06T10:29:48.51807271Z npm error

2025-12-06T10:29:48.51807437Z npm error Usage:

2025-12-06T10:29:48.51807602Z npm error npm ci

2025-12-06T10:29:48.51807767Z npm error

2025-12-06T10:29:48.51808029Z npm error Options:

2025-12-06T10:29:48.51808203Z npm error [--install-strategy <hoisted|nested|shallow|linked>] [--legacy-bundling]

2025-12-06T10:29:48.51808379Z npm error [--global-style] [--omit <dev|optional|peer> [--omit <dev|optional|peer> ...]]

2025-12-06T10:29:48.51808551Z npm error [--include <prod|dev|optional|peer> [--include <prod|dev|optional|peer> ...]]

2025-12-06T10:29:48.51809482Z npm error [--strict-peer-deps] [--foreground-scripts] [--ignore-scripts] [--no-audit]

2025-12-06T10:29:48.51809664Z npm error [--no-bin-links] [--no-fund] [--dry-run]

2025-12-06T10:29:48.51809831Z npm error [-w|--workspace <workspace-name> [-w|--workspace <workspace-name> ...]]

2025-12-06T10:29:48.51809998Z npm error [-ws|--workspaces] [--include-workspace-root] [--install-links]

2025-12-06T10:29:48.51810166Z npm error

2025-12-06T10:29:48.51810335Z npm error aliases: clean-install, ic, install-clean, isntall-clean

2025-12-06T10:29:48.51810503Z npm error

2025-12-06T10:29:48.518106701Z npm error Run "npm help ci" for more info

2025-12-06T10:29:48.518108401Z npm error A complete log of this run can be found in: /opt/render/.cache/_logs/2025-12-06T10_28_54_770Z-debug-0.log

2025-12-06T10:29:48.616885168Z ==> Build failed 😞

2025-12-06T10:29:48.616897178Z ==> Common ways to troubleshoot your deploy: https://render.com/docs/troubleshooting-deploys

---

**Cursor**

Fixed the Render install failure by regenerating a clean, complete `package-lock.json`. Steps taken:
- Removed the corrupted lockfile and recreated it with `npm install --package-lock-only`.
- Verified with a fresh `npm ci` (succeeds locally), then removed the temporary `node_modules` folder to keep the workspace clean.

What to do next:
- Commit and push the updated `package-lock.json`, then redeploy on Render.
- Optional: `npm audit fix` if you want to address the reported vulnerabilities.

---

**User**

You created on top of the Render log errors 223 Problems. Fix them all. Now I have to customers and no data whatsover everywhere. Meaning instead of fixing it you created even more errors! Classic behaviour of yours. And you said that you fixed it above?! This is ridiculous. Absolutely ridiculous! 

---

**Cursor**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { customers, customerTags, tags } from '@/lib/db/schema';
import { eq, desc, like, or, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

// #region agent log
const debugLog = (location: string, message: string, data: Record<string, unknown>, hypothesisId: string) => {
  fetch('http://127.0.0.1:7242/ingest/2e146d35-fb58-447a-b3a0-2eabdca19cf2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
};
// #endregion

// Default org ID for now (will be replaced with auth)
const DEFAULT_ORG_ID = 'org_kktires';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category');
    const city = searchParams.get('city');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // #region agent log
    debugLog(
      'api/customers:GET:start',
      'Fetching customers with filters',
      { search, category, city, page, limit, hypothesisId: 'H1' },
      'H1'
    );
    // #endregion

    // Build query conditions
    let query = db
      .select({
        id: customers.id,
        firstName: customers.firstName,
        lastName: customers.lastName,
        company: customers.company,
        email: customers.email,
        phone: customers.phone,
        mobile: customers.mobile,
        city: customers.city,
        category: customers.category,
        revenue: customers.revenue,
        isVip: customers.isVip,
        afm: customers.afm,
        createdAt: customers.createdAt,
        updatedAt: customers.updatedAt,
      })
      .from(customers)
      .where(eq(customers.orgId, DEFAULT_ORG_ID))
      .orderBy(desc(customers.createdAt))
      .limit(limit)
      .offset(offset);

    const allCustomers = await query;

    // #region agent log
    debugLog(
      'api/customers:GET:afterQuery',
      'Customers query completed',
      { returned: allCustomers.length, hypothesisId: 'H2' },
      'H2'
    );
    // #endregion

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(customers)
      .where(eq(customers.orgId, DEFAULT_ORG_ID));
    
    const total = countResult[0]?.count || 0;

    // Get tags for each customer
    const customerIds = allCustomers.map(c => c.id);
    const customerTagsData = customerIds.length > 0 
      ? await db
          .select({
            customerId: customerTags.customerId,
            tagId: tags.id,
            tagName: tags.name,
            tagColor: tags.color,
          })
          .from(customerTags)
          .innerJoin(tags, eq(customerTags.tagId, tags.id))
          .where(sql`${customerTags.customerId} IN ${customerIds}`)
      : [];

    // Map tags to customers
    const customersWithTags = allCustomers.map(customer => ({
      ...customer,
      tags: customerTagsData
        .filter(ct => ct.customerId === customer.id)
        .map(ct => ({ id: ct.tagId, name: ct.tagName, color: ct.tagColor })),
    }));

    return NextResponse.json({
      customers: customersWithTags,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    // #region agent log
    debugLog(
      'api/customers:GET:error',
      'Error fetching customers',
      { error: String(error), hypothesisId: 'H3' },
      'H3'
    );
    // #endregion
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const newCustomer = await db.insert(customers).values({
      id: `cust_${nanoid()}`,
      orgId: DEFAULT_ORG_ID,
      firstName: body.firstName,
      lastName: body.lastName || null,
      company: body.company || null,
      email: body.email || null,
      phone: body.phone || null,
      mobile: body.mobile || null,
      street: body.street || null,
      city: body.city || null,
      postalCode: body.postalCode || null,
      country: body.country || 'Ελλάδα',
      afm: body.afm || null,
      doy: body.doy || null,
      category: body.category || 'retail',
      revenue: body.revenue || 0,
      isVip: body.isVip || false,
      notes: body.notes || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    return NextResponse.json(newCustomer[0], { status: 201 });
  } catch (error) {
    console.error('Error creating customer:', error);
    return NextResponse.json(
      { error: 'Failed to create customer' },
      { status: 500 }
    );
  }
}


```

I get the frustration—let’s pin this down with real runtime evidence.

Hypotheses (to prove/disprove with logs):
- H1: Customers query returns 0 because filters/orgId (`org_kktires`) or pagination are excluding data.
- H2: Database connectivity/env (TURSO_DATABASE_URL/AUTH_TOKEN) is missing or pointing to an empty DB, so queries return nothing.
- H3: The GET handler is throwing (SQL/connection error), so the UI falls back to empty state.

Instrumentation I just added (kept folded):
- `src/app/api/customers/route.ts`: three debug logs for GET:
  - `api/customers:GET:start` (params)
  - `api/customers:GET:afterQuery` (rows returned)
  - `api/customers:GET:error` (catch)
- Existing DB init log remains in `src/lib/db/index.ts`.
- All logs post to `http://127.0.0.1:7242/ingest/2e146d35-fb58-447a-b3a0-2eabdca19cf2`, writing NDJSON to `c:\Users\Stelios\kktires-web\.cursor\debug.log`.

Log reset:
- I attempted to clear `c:\Users\Stelios\kktires-web\.cursor\debug.log`, but deletion is blocked (protected file). Please delete it manually before reproducing so we get a clean run.

What to do now: please reproduce once so we can read the fresh logs.

<reproduction_steps>
1. Manually delete the log file at `c:\Users\Stelios\kktires-web\.cursor\debug.log` (required because automated delete is blocked).
2. Start the app as you normally do (or ensure it’s running).
3. Trigger a customers fetch (e.g., load the customers list page or call `GET /api/customers` once).
4. After it loads/fails, press the “Reproduced” button in the UI so I can pull and analyze the new logs.
</reproduction_steps>

Once you run this, I’ll read the NDJSON log, confirm/reject the hypotheses with specific log lines, and we’ll fix based on evidence.

