export type PermissibleQueryResponse = {
  // mutationType is for the queries that directly mutate the db
  mutationType: {
    fields: PermissibleQuery[];
  };
  // queryType is for the queries that just read from the db
  queryType: {
    fields: PermissibleQuery[];
  };
};

export type PermissibleQuery = {
  name: string;
};
