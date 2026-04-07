export interface ParentDetails {
  fatherName: string;
  motherName: string;
  phone: string;
  email: string;
}

export interface AddressDetails {
  street: string;
  city: string;
  state: string;
  pincode: string;
}

export interface Student {
  id: string; // Firestore document ID
  rollNumber: string; // Formatted ID/Roll Number
  fullName: string;
  classId: string;
  sectionId: string;
  parentId: string;
  parentDetails: ParentDetails;
  addressDetails: AddressDetails;
  dateOfBirth: string;
  admissionDate: string;
  branchId: string;
  bloodGroup: string;
  gender: string;
  // UI helper fields
  attendanceRate?: number;
  feeStatus?: 'paid' | 'pending';
}
