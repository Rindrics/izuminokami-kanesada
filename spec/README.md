# 形式仕様

<!-- 仕様とその根拠となる .tla を列挙-->

- **AuthButtonState.tla**: AuthButton の UI state 管理を検証
  - フォームパネルの相互排他（ログイン・新規登録・パスワードリセットは同時に1つだけ表示）
  - 認証状態（loading/guest/user）の型安全性
  - 状態遷移の正確性（ToggleLoginForm, NavigateToSignUp など）
  - 認証状態変更時の state リセット（ログアウト時にフォームを閉じるなど）
