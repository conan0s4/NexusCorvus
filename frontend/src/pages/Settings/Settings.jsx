import { useEffect, useState } from "react";
import {
  getCurrentUser,
  updateProfile,
  changePassword,
} from "../../api/authApi";

import "./Settings.css";

function Settings() {
  const [username, setUsername] = useState("");
  const [newUsername, setNewUsername] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [usernameMessage, setUsernameMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");

  const [usernameError, setUsernameError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [loading, setLoading] = useState(true);
  const [savingUsername, setSavingUsername] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  async function loadUser() {
    try {
      const user = await getCurrentUser();

      setUsername(user.username);
      setNewUsername(user.username);
    } catch (error) {
      setUsernameError(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUser();
  }, []);

  async function handleUsernameSubmit(e) {
    e.preventDefault();

    setUsernameMessage("");
    setUsernameError("");

    if (!newUsername.trim()) {
      setUsernameError("Username is required.");
      return;
    }

    if (newUsername === username) {
      setUsernameMessage("Username is already up to date.");
      return;
    }

    setSavingUsername(true);

    try {
      const updatedUser = await updateProfile({
        username: newUsername.trim(),
      });

      setUsername(updatedUser.username);
      setNewUsername(updatedUser.username);

      setUsernameMessage("Username updated successfully.");
    } catch (error) {
      setUsernameError(error.message);
    } finally {
      setSavingUsername(false);
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();

    setPasswordMessage("");
    setPasswordError("");

    if (!currentPassword || !newPassword) {
      setPasswordError(
        "Current password and new password are required."
      );
      return;
    }

    setChangingPassword(true);

    try {
      await changePassword(
        currentPassword,
        newPassword
      );

      setCurrentPassword("");
      setNewPassword("");

      setPasswordMessage(
        "Password changed successfully."
      );
    } catch (error) {
      setPasswordError(error.message);
    } finally {
      setChangingPassword(false);
    }
  }

  if (loading) {
    return (
      <div className="settings-page">
        <div className="nc-empty">
          <div className="nc-empty-title">
            Loading settings...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">

      <header className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">
            Account and workspace configuration
          </p>
        </div>
      </header>

      {/* USERNAME */}

      <section className="nc-panel settings-card">

        <div className="panel-header">
          <div>
            <div className="panel-eyebrow">
              ACCOUNT
            </div>
            <h2 className="panel-title">
              USERNAME
            </h2>
          </div>
        </div>

        <form className="settings-form" onSubmit={handleUsernameSubmit}>

          <div className="nc-field">
            <label className="nc-field-label" htmlFor="settings-username">
              USERNAME
            </label>
            <input
              id="settings-username"
              className="nc-input"
              type="text"
              value={newUsername}
              onChange={(e) =>
                setNewUsername(e.target.value)
              }
              autoComplete="username"
            />
          </div>

          {usernameMessage && (
            <div className="settings-success">
              {usernameMessage}
            </div>
          )}

          {usernameError && (
            <div className="nc-error-banner">
              {usernameError}
            </div>
          )}

          <div className="settings-actions">
            <button
              type="submit"
              className="nc-btn nc-btn-primary"
              disabled={savingUsername}
            >
              {savingUsername ? "SAVING..." : "SAVE USERNAME"}
            </button>
          </div>

        </form>

      </section>

      {/* PASSWORD */}

      <section className="nc-panel settings-card">

        <div className="panel-header">
          <div>
            <div className="panel-eyebrow">
              ACCOUNT
            </div>
            <h2 className="panel-title">
              PASSWORD
            </h2>
          </div>
        </div>

        <form className="settings-form" onSubmit={handlePasswordSubmit}>

          <div className="nc-field">
            <label className="nc-field-label" htmlFor="settings-current-password">
              CURRENT PASSWORD
            </label>
            <input
              id="settings-current-password"
              className="nc-input"
              type="password"
              value={currentPassword}
              onChange={(e) =>
                setCurrentPassword(e.target.value)
              }
              autoComplete="current-password"
            />
          </div>

          <div className="nc-field">
            <label className="nc-field-label" htmlFor="settings-new-password">
              NEW PASSWORD
            </label>
            <input
              id="settings-new-password"
              className="nc-input"
              type="password"
              value={newPassword}
              onChange={(e) =>
                setNewPassword(e.target.value)
              }
              autoComplete="new-password"
            />
          </div>

          {passwordMessage && (
            <div className="settings-success">
              {passwordMessage}
            </div>
          )}

          {passwordError && (
            <div className="nc-error-banner">
              {passwordError}
            </div>
          )}

          <div className="settings-actions">
            <button
              type="submit"
              className="nc-btn nc-btn-primary"
              disabled={changingPassword}
            >
              {changingPassword ? "CHANGING..." : "CHANGE PASSWORD"}
            </button>
          </div>

        </form>

      </section>

    </div>
  );
}

export default Settings;