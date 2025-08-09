export type Profile = {
  id: string;
  background_url: string | null;
  updated_at: string | null;
};

export type Checkin = {
  id: string;
  user_id: string;
  photo_url: string;
  created_at: string;
  location: string | null;
  device_info: string | null;
};

