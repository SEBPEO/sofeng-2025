import styles from './Legal.module.css';

export const Legal = () => {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Legal Information & Privacy Policy</h1>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>1. Introduction</h2>
          <p>
            This application is developed as part of Software Engineering course project. It is intended for
            educational and demonstration purposes only.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>2. Data We Collect</h2>
          <p>The application may collect the following data:</p>
          <ul className={styles.list}>
            <li>
              Basic profile information provided by OAuth providers (such as name, email address, and profile
              picture)
            </li>
            <li>Authentication identifiers required to log in</li>
            <li>User-generated content created within the application</li>
          </ul>
          <p>No sensitive personal data is collected beyond what is necessary for application functionality.</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>3. Purpose of Data Collection</h2>
          <p>User data is collected solely to:</p>
          <ul className={styles.list}>
            <li>Authenticate users</li>
            <li>Provide access to application features</li>
            <li>Maintain user sessions</li>
            <li>Demonstrate functionality for academic evaluation</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>4. Data Storage and Retention</h2>
          <ul className={styles.list}>
            <li>User data is stored securely in the application database.</li>
            <li>Data is retained only for the duration necessary to fulfill the project requirements.</li>
            <li>Data may be deleted after the course or project evaluation period.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>5. Data Export and Deletion Requests</h2>
          <p>Users may request:</p>
          <ul className={styles.list}>
            <li>Export of their personal data</li>
            <li>Deletion of their personal data</li>
          </ul>
          <p>
            Requests are processed in accordance with this policy. Upon request, data will be provided or deleted
            within a reasonable timeframe.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>6. Data Sharing and Permissions</h2>
          <ul className={styles.list}>
            <li>User data is not shared with third parties.</li>
            <li>OAuth providers (e.g., Google, GitHub) are used exclusively for authentication purposes.</li>
            <li>Access to user data is limited to authorized components of the application.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>7. Security</h2>
          <p>
            Reasonable technical and organizational measures are implemented to protect user data from
            unauthorized access or misuse.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>8. Contact</h2>
          <p>
            For questions or data-related requests, users may contact the project administrator via email:{' '}
            <a href="mailto:sebpeoseprojct@gmail.com" className={styles.link}>
              sebpeoseprojct@gmail.com
            </a>
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>9. Educational Use Disclaimer</h2>
          <p>This application is developed for educational purposes and is not intended for commercial use.</p>
        </section>
      </div>
    </div>
  );
};
