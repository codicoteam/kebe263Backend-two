const contactService = require('../services/contact.service');
const { success } = require('../utils/apiResponse');

// ─── Public ───────────────────────────────────────────────────────────────────

const submitContact = async (req, res, next) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    const contact = await contactService.submitContact({ name, email, phone, subject, message });
    return success(res, 'Thanks for reaching out — we will get back to you soon.', { contact }, 201);
  } catch (err) { next(err); }
};

// ─── Admin ────────────────────────────────────────────────────────────────────

const getAllContacts = async (req, res, next) => {
  try {
    const result = await contactService.adminGetAllContacts(req.query);
    return success(res, 'Messages fetched', result);
  } catch (err) { next(err); }
};

const getContactById = async (req, res, next) => {
  try {
    const contact = await contactService.getContactById(req.params.id);
    return success(res, 'Message fetched', { contact });
  } catch (err) { next(err); }
};

const markRead = async (req, res, next) => {
  try {
    const contact = await contactService.markContactRead(req.params.id);
    return success(res, 'Marked as read', { contact });
  } catch (err) { next(err); }
};

const markResponded = async (req, res, next) => {
  try {
    const contact = await contactService.markContactResponded(req.user._id, req.params.id);
    return success(res, 'Marked as responded', { contact });
  } catch (err) { next(err); }
};

const archiveContact = async (req, res, next) => {
  try {
    const contact = await contactService.archiveContact(req.params.id);
    return success(res, 'Message archived', { contact });
  } catch (err) { next(err); }
};

const deleteContact = async (req, res, next) => {
  try {
    await contactService.deleteContact(req.params.id);
    return success(res, 'Message deleted');
  } catch (err) { next(err); }
};

module.exports = {
  submitContact,
  getAllContacts,
  getContactById,
  markRead,
  markResponded,
  archiveContact,
  deleteContact,
};
