'use client';

import React from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { CreateUserData, USER_ROLES } from '@/types/user';
import { X } from 'lucide-react';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: CreateUserData) => Promise<void>;
  isLoading?: boolean;
}

const validationSchema = Yup.object().shape({
  name: Yup.string().required('Name is required'),
  email: Yup.string().email('Invalid email').required('Email is required'),
  password: Yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
  role: Yup.string().oneOf(USER_ROLES, 'Invalid role').required('Role is required'),
});

const initialValues: CreateUserData = {
  name: '',
  email: '',
  password: '',
  role: 'teacher',
};

export default function CreateUserModal({ isOpen, onClose, onSubmit, isLoading }: CreateUserModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-md rounded-2xl shadow-xl border border-border animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h3 className="text-xl font-bold tracking-tight">Create New User</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-full hover:bg-muted">
            <X size={20} />
          </button>
        </div>

        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={async (values) => {
            await onSubmit(values);
            onClose();
          }}
        >
          {({ isSubmitting, isValid }) => (
            <Form className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1">Full Name</label>
                <Field
                  name="name"
                  placeholder="John Doe"
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <ErrorMessage name="name" component="div" className="text-red-500 text-xs mt-1 font-bold" />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">Email Address</label>
                <Field
                  name="email"
                  type="email"
                  placeholder="john@example.com"
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <ErrorMessage name="email" component="div" className="text-red-500 text-xs mt-1 font-bold" />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">Password</label>
                <Field
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <ErrorMessage name="password" component="div" className="text-red-500 text-xs mt-1 font-bold" />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">Role</label>
                <Field
                  as="select"
                  name="role"
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="admin">Admin</option>
                  <option value="sub-admin">Sub Admin</option>
                  <option value="teacher">Teacher</option>
                  <option value="parent">Parent</option>
                </Field>
                <ErrorMessage name="role" component="div" className="text-red-500 text-xs mt-1 font-bold" />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-border mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || isSubmitting || !isValid}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:scale-100 flex items-center gap-2"
                >
                  {isLoading && <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  Create User
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
}
