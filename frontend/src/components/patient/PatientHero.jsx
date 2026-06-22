import { APP_NAME } from '../../utils/constants';

export default function PatientHero({ user, clinicInfo }) {
  const greeting = user?.first_name ? `Welcome back, ${user.first_name}` : 'Welcome to your portal';

  return (
    <div className="patient-hero">
      <p className="text-sm font-medium text-sky-100">🦷 {APP_NAME}</p>
      <h1 className="mt-1 text-2xl font-bold">{greeting}</h1>
      {clinicInfo && (
        <p className="mt-2 text-sm text-sky-100">
          {clinicInfo.schedule} · {clinicInfo.lunch_break}
        </p>
      )}
    </div>
  );
}
