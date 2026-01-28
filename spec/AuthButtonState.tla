------------------------------- MODULE AuthButtonState -------------------------------
(**
  TLA+ specification for AuthButton (src/components/AuthButton.tsx) state management.

  Verifies that UI state variables remain consistent:
  - When guest: at most one of showLoginForm, showSignUpForm, showResetForm is TRUE
    (form panel mutual exclusion)
  - When user: showUserMenu is independent; form states are not rendered but we still
    require they could satisfy the mutex if we were in guest (stale state is harmless)
  - auth reflects loading | guest | user from AuthContext (user, loading)
*)
EXTENDS Integers

(* Auth state from context: loading, or guest (no user), or user (logged in) *)
VARIABLES auth, showLoginForm, showUserMenu, showSignUpForm, showResetForm

(* Set of auth values *)
AuthType == {"loading", "guest", "user"}

(* Initial state: loading, no panels open *)
Init ==
  /\ auth = "loading"
  /\ showLoginForm = FALSE
  /\ showUserMenu = FALSE
  /\ showSignUpForm = FALSE
  /\ showResetForm = FALSE

(* Form panel mutex: at most one of the three form panels is active *)
FormPanelMutex ==
  ~ (showLoginForm /\ showSignUpForm)
  /\ ~ (showLoginForm /\ showResetForm)
  /\ ~ (showSignUpForm /\ showResetForm)

(* Type invariant: auth is in allowed set *)
TypeOk == auth \in AuthType

(* State invariants: booleans *)
StateOk ==
  /\ showLoginForm \in BOOLEAN
  /\ showUserMenu \in BOOLEAN
  /\ showSignUpForm \in BOOLEAN
  /\ showResetForm \in BOOLEAN

(* Invariant: type ok and form panel mutex always holds *)
Invariant == TypeOk /\ StateOk /\ FormPanelMutex

(* Toggle "我入門也" button: flip showLoginForm, close signup/reset *)
ToggleLoginForm ==
  /\ auth = "guest"
  /\ showLoginForm' = ~showLoginForm
  /\ showSignUpForm' = FALSE
  /\ showResetForm' = FALSE
  /\ showUserMenu' = showUserMenu
  /\ auth' = auth

(* Click user name: toggle user dropdown *)
ToggleUserMenu ==
  /\ auth = "user"
  /\ showUserMenu' = ~showUserMenu
  /\ showLoginForm' = showLoginForm
  /\ showSignUpForm' = showSignUpForm
  /\ showResetForm' = showResetForm
  /\ auth' = auth

(* Close user menu (backdrop or after logout) *)
CloseUserMenu ==
  /\ auth = "user"
  /\ showUserMenu' = FALSE
  /\ showLoginForm' = showLoginForm
  /\ showSignUpForm' = showSignUpForm
  /\ showResetForm' = showResetForm
  /\ auth' = auth

(* From login panel: navigate to signup *)
NavigateToSignUp ==
  /\ auth = "guest"
  /\ showLoginForm' = FALSE
  /\ showSignUpForm' = TRUE
  /\ showResetForm' = FALSE
  /\ showUserMenu' = showUserMenu
  /\ auth' = auth

(* From login/signup panel: navigate to reset *)
NavigateToReset ==
  /\ auth = "guest"
  /\ showLoginForm' = FALSE
  /\ showSignUpForm' = FALSE
  /\ showResetForm' = TRUE
  /\ showUserMenu' = showUserMenu
  /\ auth' = auth

(* From signup/reset panel: navigate back to login *)
NavigateToLogin ==
  /\ auth = "guest"
  /\ showLoginForm' = TRUE
  /\ showSignUpForm' = FALSE
  /\ showResetForm' = FALSE
  /\ showUserMenu' = showUserMenu
  /\ auth' = auth

(* Auth context changes: loading -> guest/user, or login success guest -> user, or logout user -> guest *)
AuthToGuest ==
  /\ auth' = "guest"
  /\ showLoginForm' = FALSE
  /\ showSignUpForm' = FALSE
  /\ showResetForm' = FALSE
  /\ showUserMenu' = FALSE
  /\ auth \in {"loading", "user"}

AuthToUser ==
  /\ auth' = "user"
  /\ showUserMenu' = FALSE
  /\ showLoginForm' = showLoginForm
  /\ showSignUpForm' = showSignUpForm
  /\ showResetForm' = showResetForm
  /\ auth \in {"loading", "guest"}

AuthLoading ==
  /\ auth' = "loading"
  /\ UNCHANGED <<showLoginForm, showUserMenu, showSignUpForm, showResetForm>>
  /\ auth \in {"guest", "user"}

Next ==
  \/ ToggleLoginForm
  \/ ToggleUserMenu
  \/ CloseUserMenu
  \/ NavigateToSignUp
  \/ NavigateToReset
  \/ NavigateToLogin
  \/ AuthToGuest
  \/ AuthToUser
  \/ AuthLoading

Spec == Init /\ [][Next]_<<auth, showLoginForm, showUserMenu, showSignUpForm, showResetForm>>

=============================================================================
