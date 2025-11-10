import styles from './Patients.module.css';

export const Patients = () => {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Patients</h1>
      <p className={styles.description}>
        Your patient list will appear here
      </p>
      {/* Add your patients content here */}
    </div>
  );
};
