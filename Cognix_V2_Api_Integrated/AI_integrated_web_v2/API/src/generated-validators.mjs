import ucs2module from "ajv/dist/runtime/ucs2length.js";
const ucs2length = ucs2module.default || ucs2module;
"use strict";
export const validateInterpretation = validate10;
const schema11 = {"type":"object","additionalProperties":false,"properties":{"classification":{"type":"string","enum":["pass","fail","uncertain"]},"quote":{"type":"string","maxLength":1000},"note":{"type":"string","maxLength":500}},"required":["classification","quote","note"]};
const func2 = ucs2length;

function validate10(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.classification === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "classification"},message:"must have required property '"+"classification"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.quote === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "quote"},message:"must have required property '"+"quote"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.note === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "note"},message:"must have required property '"+"note"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
for(const key0 in data){
if(!(((key0 === "classification") || (key0 === "quote")) || (key0 === "note"))){
const err3 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
}
if(data.classification !== undefined){
let data0 = data.classification;
if(typeof data0 !== "string"){
const err4 = {instancePath:instancePath+"/classification",schemaPath:"#/properties/classification/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
if(!(((data0 === "pass") || (data0 === "fail")) || (data0 === "uncertain"))){
const err5 = {instancePath:instancePath+"/classification",schemaPath:"#/properties/classification/enum",keyword:"enum",params:{allowedValues: schema11.properties.classification.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
}
if(data.quote !== undefined){
let data1 = data.quote;
if(typeof data1 === "string"){
if(func2(data1) > 1000){
const err6 = {instancePath:instancePath+"/quote",schemaPath:"#/properties/quote/maxLength",keyword:"maxLength",params:{limit: 1000},message:"must NOT have more than 1000 characters"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
}
else {
const err7 = {instancePath:instancePath+"/quote",schemaPath:"#/properties/quote/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
}
if(data.note !== undefined){
let data2 = data.note;
if(typeof data2 === "string"){
if(func2(data2) > 500){
const err8 = {instancePath:instancePath+"/note",schemaPath:"#/properties/note/maxLength",keyword:"maxLength",params:{limit: 500},message:"must NOT have more than 500 characters"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
}
else {
const err9 = {instancePath:instancePath+"/note",schemaPath:"#/properties/note/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
}
}
else {
const err10 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
validate10.errors = vErrors;
return errors === 0;
}

export const validatePlan = validate11;
const schema12 = {"type":"object","additionalProperties":false,"properties":{"hypothesis":{"type":"string","enum":["concept","calculation","application","units","interpretation","recall","connection","distraction","task_size","prerequisite","difficulty"]},"question_id":{"type":"string","enum":["formula","force_change","division","division_transfer","substitution","application_transfer","unit","unit_transfer","identify","identify_transfer","recall","recall_second","connection","connection_transfer","distraction","distraction_second","task_size","task_size_second","prerequisite","prerequisite_second","difficulty","difficulty_second"]},"question":{"type":"string","minLength":8,"maxLength":280}},"required":["hypothesis","question_id","question"]};

function validate11(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){
let vErrors = null;
let errors = 0;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.hypothesis === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "hypothesis"},message:"must have required property '"+"hypothesis"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.question_id === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "question_id"},message:"must have required property '"+"question_id"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.question === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "question"},message:"must have required property '"+"question"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
for(const key0 in data){
if(!(((key0 === "hypothesis") || (key0 === "question_id")) || (key0 === "question"))){
const err3 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
}
if(data.hypothesis !== undefined){
let data0 = data.hypothesis;
if(typeof data0 !== "string"){
const err4 = {instancePath:instancePath+"/hypothesis",schemaPath:"#/properties/hypothesis/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
if(!(((((((((((data0 === "concept") || (data0 === "calculation")) || (data0 === "application")) || (data0 === "units")) || (data0 === "interpretation")) || (data0 === "recall")) || (data0 === "connection")) || (data0 === "distraction")) || (data0 === "task_size")) || (data0 === "prerequisite")) || (data0 === "difficulty"))){
const err5 = {instancePath:instancePath+"/hypothesis",schemaPath:"#/properties/hypothesis/enum",keyword:"enum",params:{allowedValues: schema12.properties.hypothesis.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
}
if(data.question_id !== undefined){
let data1 = data.question_id;
if(typeof data1 !== "string"){
const err6 = {instancePath:instancePath+"/question_id",schemaPath:"#/properties/question_id/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
if(!((((((((((((((((((((((data1 === "formula") || (data1 === "force_change")) || (data1 === "division")) || (data1 === "division_transfer")) || (data1 === "substitution")) || (data1 === "application_transfer")) || (data1 === "unit")) || (data1 === "unit_transfer")) || (data1 === "identify")) || (data1 === "identify_transfer")) || (data1 === "recall")) || (data1 === "recall_second")) || (data1 === "connection")) || (data1 === "connection_transfer")) || (data1 === "distraction")) || (data1 === "distraction_second")) || (data1 === "task_size")) || (data1 === "task_size_second")) || (data1 === "prerequisite")) || (data1 === "prerequisite_second")) || (data1 === "difficulty")) || (data1 === "difficulty_second"))){
const err7 = {instancePath:instancePath+"/question_id",schemaPath:"#/properties/question_id/enum",keyword:"enum",params:{allowedValues: schema12.properties.question_id.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
}
if(data.question !== undefined){
let data2 = data.question;
if(typeof data2 === "string"){
if(func2(data2) > 280){
const err8 = {instancePath:instancePath+"/question",schemaPath:"#/properties/question/maxLength",keyword:"maxLength",params:{limit: 280},message:"must NOT have more than 280 characters"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
if(func2(data2) < 8){
const err9 = {instancePath:instancePath+"/question",schemaPath:"#/properties/question/minLength",keyword:"minLength",params:{limit: 8},message:"must NOT have fewer than 8 characters"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
}
else {
const err10 = {instancePath:instancePath+"/question",schemaPath:"#/properties/question/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
}
}
else {
const err11 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
validate11.errors = vErrors;
return errors === 0;
}
