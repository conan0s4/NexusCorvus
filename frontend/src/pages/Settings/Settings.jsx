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

  useEffect(() => {
    loadUser();
  }, []);

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
        <div className="settings-loading">
          Loading settings...
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">

      <div className="settings-header">
        <h1>Settings</h1>
        <p>
          Manage your NexusCorvus account settings.
        </p>
      </div>

      {/* USERNAME */}

      <section className="settings-card">

        <div className="settings-card-header">
          <h2>Account</h2>
          <p>
            Update the username associated with your account.
          </p>
        </div>

        <form onSubmit={handleUsernameSubmit}>

          <div className="settings-field">
            <label>USERNAME</label>

            <input
              type="text"
              value={newUsername}
              onChange={(e) =>
                setNewUsername(e.target.value)
              }
              autoComplete="username"
            />
          </div>

          {usernameMessage && (
            <p className="settings-success">
              {usernameMessage}
            </p>
          )}

          {usernameError && (
            <p className="settings-error">
              {usernameError}
            </p>
          )}

          <button
            type="submit"
            disabled={savingUsername}
          >
            {savingUsername
              ? "Saving..."
              : "Save Username"}
          </button>

        </form>

      </section>


      {/* PASSWORD */}

      <section className="settings-card">

        <div className="settings-card-header">
          <h2>Password</h2>
          <p>
            Change your account password.
          </p>
        </div>

        <form onSubmit={handlePasswordSubmit}>

          <div className="settings-field">
            <label>CURRENT PASSWORD</label>

            <input
              type="password"
              value={currentPassword}
              onChange={(e) =>
                setCurrentPassword(e.target.value)
              }
              autoComplete="current-password"
            />
          </div>

          <div className="settings-field">
            <label>NEW PASSWORD</label>

            <input
              type="password"
              value={newPassword}
              onChange={(e) =>
                setNewPassword(e.target.value)
              }
              autoComplete="new-password"
            />
          </div>

          {passwordMessage && (
            <p className="settings-success">
              {passwordMessage}
            </p>
          )}

          {passwordError && (
            <p className="settings-error">
              {passwordError}
            </p>
          )}

          <button
            type="submit"
            disabled={changingPassword}
          >
            {changingPassword
              ? "Changing..."
              : "Change Password"}
          </button>

        </form>

      </section>

    </div>
  );
}

export default Settings;