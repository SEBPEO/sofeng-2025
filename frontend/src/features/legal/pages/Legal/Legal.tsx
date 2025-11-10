import styles from './Legal.module.css';

export const Legal = () => {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Legal Information</h1>
      <p className={styles.description}>
        Legal content and documentation will appear here
      </p>
    </div>
  );
};
