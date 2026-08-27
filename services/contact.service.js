const Contact = require('../models/contact.model');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const submitContact = async ({ name, email, phone, subject, message }) => {
  if (!name || !email || !subject || !message) {
    throw { status: 400, message: 'name, email, subject, and message are required' };
  }
  if (!EMAIL_PATTERN.test(String(email).trim())) {
    throw { status: 400, message: 'Enter a valid email address' };
  }
  if (String(message).trim().length > 5000) {
    throw { status: 400, message: 'Message must be at most 5000 characters' };
  }

  const contact = await Contact.create({
    name: String(name).trim(),
    email: String(email).trim().toLowerCase(),
    phone: phone ? String(phone).trim() : null,
    subject: String(subject).trim(),
    message: String(message).trim(),
  });

  return contact;
};

const adminGetAllContacts = async ({ page = 1, limit = 20, status, search }) => {
  const query = {};
  if (status) query.status = status;
  if (search) {
    const re = new RegExp(String(search).trim(), 'i');
    query.$or = [{ name: re }, { email: re }, { subject: re }, { message: re }];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [contacts, total] = await Promise.all([
    Contact.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Contact.countDocuments(query),
  ]);

  return {
    contacts,
    pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
  };
};

const getContactById = async (id) => {
  const contact = await Contact.findById(id);
  if (!contact) throw { status: 404, message: 'Message not found' };
  return contact;
};

const markContactRead = async (id) => {
  const contact = await getContactById(id);
  contact.status = 'read';
  await contact.save();
  return contact;
};

const markContactResponded = async (adminId, id) => {
  const contact = await getContactById(id);
  contact.status = 'responded';
  contact.respondedBy = adminId;
  contact.respondedAt = new Date();
  await contact.save();
  return contact;
};

const archiveContact = async (id) => {
  const contact = await getContactById(id);
  contact.status = 'archived';
  await contact.save();
  return contact;
};

const deleteContact = async (id) => {
  const contact = await getContactById(id);
  await contact.deleteOne();
};

module.exports = {
  submitContact,
  adminGetAllContacts,
  getContactById,
  markContactRead,
  markContactResponded,
  archiveContact,
  deleteContact,
};
