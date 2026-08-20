type ErrorMessageProps = {
  title?: string;
  message: string;
};

export function ErrorMessage({
  title = "No se pudo completar la acción",
  message,
}: ErrorMessageProps) {
  return (
    <div
      className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
      role="alert"
    >
      <p className="font-semibold">{title}</p>
      <p className="mt-1 leading-relaxed">{message}</p>
    </div>
  );
}
