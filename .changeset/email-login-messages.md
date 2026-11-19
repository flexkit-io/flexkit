---
'@flexkit/studio': patch
---

Email login now says what went wrong. It shows a message when there have been too many attempts, and a general error for any other failure instead of nothing. When the sign-in is declined on the confirmation page, Studio stops waiting and says so. Reloading the page while waiting for the emailed link keeps waiting instead of showing the form again.
