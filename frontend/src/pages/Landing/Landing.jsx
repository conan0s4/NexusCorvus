import { useNavigate } from "react-router-dom";
import "./Landing.css";

function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing-page">

      {/* =========================================
          NAVIGATION
          ========================================= */}

      <nav className="landing-nav">

        <div className="landing-brand">

          <div>
            <div className="brand-name">
              NEXUSCORVUS
            </div>

            <div className="brand-subtitle">
              DIGITAL FORENSICS WORKSPACE
            </div>
          </div>

        </div>


        <button
          className="landing-login-button"
          onClick={() => navigate("/login")}
        >
          ENTER WORKSPACE
        </button>

      </nav>


      {/* =========================================
          HERO
          ========================================= */}

      <main className="landing-main">

        <section className="landing-hero">

          <div className="hero-content">

            <div className="hero-label">
              DIGITAL FORENSICS / INCIDENT RESPONSE
            </div>

            <h1>
              Investigate.
              <br />
              Correlate.
              <br />
              <span>Understand.</span>
            </h1>

            <p className="hero-description">
              NexusCorvus is a digital forensics investigation
              workspace designed to help analysts organize cases,
              examine detection results, correlate activity, and
              build a clearer picture of what happened.
            </p>

            <div className="hero-actions">

              <button
                className="hero-primary-button"
                onClick={() => navigate("/login")}
              >
                ENTER WORKSPACE
                <span>→</span>
              </button>

              <button
                className="hero-secondary-button"
                onClick={() =>
                  document
                    .getElementById("capabilities")
                    ?.scrollIntoView({
                      behavior: "smooth",
                    })
                }
              >
                EXPLORE NEXUSCORVUS
              </button>

            </div>

          </div>


          {/* =========================================
              VISUAL PANEL
              ========================================= */}

          <div className="hero-visual">

            <div className="visual-window">

              <div className="visual-window-header">

                <div className="window-title">
                  INVESTIGATION / CASE-042
                </div>

                <div className="window-status">
                  ACTIVE
                </div>

              </div>


              <div className="visual-timeline">

                <div className="timeline-line" />


                <div className="timeline-event">

                  <div className="timeline-marker" />

                  <div className="timeline-event-content">

                    <div className="timeline-time">
                      09:41:12
                    </div>

                    <div className="timeline-title">
                      Windows Login
                    </div>

                    <div className="timeline-meta">
                      USER: analyst
                      {" • "}
                      HOST: WORKSTATION-01
                    </div>

                  </div>

                </div>


                <div className="timeline-event">

                  <div className="timeline-marker detection" />

                  <div className="timeline-event-content">

                    <div className="timeline-time">
                      09:43:27
                    </div>

                    <div className="timeline-title">
                      PowerShell Execution
                    </div>

                    <div className="timeline-meta">
                      T1059.001
                      {" • "}
                      HIGH
                    </div>

                  </div>

                </div>


                <div className="timeline-event">

                  <div className="timeline-marker detection" />

                  <div className="timeline-event-content">

                    <div className="timeline-time">
                      09:47:03
                    </div>

                    <div className="timeline-title">
                      Suspicious Script Activity
                    </div>

                    <div className="timeline-meta">
                      SIGMA RULE
                      {" • "}
                      HIGH
                    </div>

                  </div>

                </div>


                <div className="timeline-event">

                  <div className="timeline-marker critical" />

                  <div className="timeline-event-content">

                    <div className="timeline-time">
                      09:56:44
                    </div>

                    <div className="timeline-title">
                      Credential Access
                    </div>

                    <div className="timeline-meta">
                      T1003
                      {" • "}
                      CRITICAL
                    </div>

                  </div>

                </div>

              </div>

            </div>

          </div>

        </section>


        {/* =========================================
            CAPABILITIES
            ========================================= */}

        <section
          className="landing-section"
          id="capabilities"
        >

          <div className="section-intro">

            <div className="section-label">
              INVESTIGATION WORKSPACE
            </div>

            <h2>
              From evidence to investigation.
            </h2>

            <p>
              NexusCorvus brings the pieces of an investigation
              together so analysts can focus on understanding
              activity instead of managing scattered findings.
            </p>

          </div>


          <div className="capability-grid">

            <article className="capability-card">

              <div className="capability-number">
                01
              </div>

              <h3>
                CASES
              </h3>

              <p>
                Keep investigation context, findings, events,
                detections, and analyst notes organized within
                individual cases.
              </p>

            </article>


            <article className="capability-card">

              <div className="capability-number">
                02
              </div>

              <h3>
                DETECTIONS
              </h3>

              <p>
                Review detection results, severity, affected
                hosts, users, rules, and associated MITRE
                ATT&CK techniques.
              </p>

            </article>


            <article className="capability-card">

              <div className="capability-number">
                03
              </div>

              <h3>
                INVESTIGATION
              </h3>

              <p>
                Connect activity across time and preserve
                analyst observations through investigation
                notes and case context.
              </p>

            </article>

          </div>

        </section>


        {/* =========================================
            WORKFLOW
            ========================================= */}

        <section className="workflow-section">

          <div className="section-label">
            INVESTIGATION FLOW
          </div>

          <h2>
            Follow the evidence.
          </h2>


          <div className="workflow">

            <div className="workflow-step">

              <span>01</span>

              <strong>
                EVIDENCE
              </strong>

              <small>
                Logs & records
              </small>

            </div>


            <div className="workflow-connector">
              →
            </div>


            <div className="workflow-step">

              <span>02</span>

              <strong>
                ANALYSIS
              </strong>

              <small>
                Parse & examine
              </small>

            </div>


            <div className="workflow-connector">
              →
            </div>


            <div className="workflow-step">

              <span>03</span>

              <strong>
                DETECTION
              </strong>

              <small>
                Identify activity
              </small>

            </div>


            <div className="workflow-connector">
              →
            </div>


            <div className="workflow-step">

              <span>04</span>

              <strong>
                INVESTIGATION
              </strong>

              <small>
                Correlate & understand
              </small>

            </div>

          </div>

        </section>


        {/* =========================================
            CTA
            ========================================= */}

        <section className="landing-cta">

          <div>

            <div className="section-label">
              NEXUSCORVUS
            </div>

            <h2>
              Start an investigation.
            </h2>

            <p>
              Enter the workspace and begin working with your cases.
            </p>

          </div>


          <button
            className="hero-primary-button"
            onClick={() => navigate("/login")}
          >
            ENTER WORKSPACE
            <span>→</span>
          </button>

        </section>

      </main>


      {/* =========================================
          FOOTER
          ========================================= */}

      <footer className="landing-footer">

        <span>
          NEXUSCORVUS
        </span>

        <span>
          DIGITAL FORENSICS INVESTIGATION WORKSPACE
        </span>

      </footer>

    </div>
  );
}

export default Landing;