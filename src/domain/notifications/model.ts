export type DemoNotification = {
  id: string;
  text: string;
  createdAt: string;
  read: boolean;
  channel: "app" | "correo-simulado";
};
