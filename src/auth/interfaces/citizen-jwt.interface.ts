export type CitizenJwtPayload = {
  sub: string;
  companyId: string;
  cityId: string;
  phone: string;
  typ: 'citizen';
};
