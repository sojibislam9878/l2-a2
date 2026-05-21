export interface IResIssue {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  reporter_id: number;
  created_at: string;
  updated_at: string;
}

export interface IIssueWithReporter {
  id: number;
  title: string;
  description: string;
  type: string;
  status: string;
  reporter: {
    id: number;
    name: string;
    role: string;
  };
  created_at: string;
  updated_at: string;
}
